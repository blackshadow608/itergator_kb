/* --- src/scp.js --- */
var SCP = SCP || {}

/* --- src/scp-namespaces.js --- */
SCP.Graph = {};
SCP.Controls = {};

/* --- src/scp-keynodes.js --- */
SCP.Keynodes = function() {
  
}

SCP.Keynodes.IDENTIFIERS = [
  'rrel_1',
  'rrel_2',
  'rrel_3',
  'rrel_4',
  'rrel_5',
  'rrel_init',
  'nrel_goto',
  'nrel_then',
  'nrel_else',
  'breakpoint',
  'question',
  'question_initiated',
  'question_finished',
  'question_unpausing_paused_operator',
  'question_transition_to_next_operator',
  'question_adding_breakpoint',
  'scp_operator_atomic_type',
  'scp_process',
  'scp_paused_operator',
  'varAssign',
  'searchSetStr3',
  'searchElStr3',
  'searchElStr5',
  'return',
  'eraseEl',
  'varAssign',
  'sys_search',
  'ifVarAssign',
  'print',
  'genEl'
];

SCP.Keynodes.prototype.init = function() {
  var deferred = $.Deferred();
  var self = this;
  SCWeb.core.Server.resolveScAddr(SCP.Keynodes.IDENTIFIERS, function (keynodes) {
    self.keynodes = keynodes;
    self.identifiers = {};
    for(var keynode in keynodes)
      self.identifiers[keynodes[keynode]] = keynode;
    deferred.resolve();
  });
  return deferred;
};

SCP.Keynodes.prototype.get = function(identifier) {
  return this.keynodes[identifier];
};

SCP.Keynodes.prototype.getIdentifierByAddress = function(address) {
  return this.identifiers[address];
};

/* --- src/scp-model.js --- */
SCP.Model = function() {
  this.initGraph();
  this.initSubscribers();
};

SCP.Model.prototype.initGraph = function() {
  this.graph = {
    nodes: {
    },
    edges: {
    }
  }
};

SCP.Model.prototype.initSubscribers = function() {
  this.subscribers = [];
};

SCP.Model.prototype.setProcess = function(process) {
  this.process = process;
  this.notify();
};

SCP.Model.prototype.getProcess = function() {
  return this.process;
};

SCP.Model.prototype.setCurrentOperator = function(operator) {
  this.currentOperator = operator;
  this.notify();
};

SCP.Model.prototype.getCurrentOperator = function() {
  return this.currentOperator;
};

SCP.Model.prototype.getGraph = function() {
  return this.graph;
};

SCP.Model.prototype.setGraph = function(graph) {
  this.graph = graph;
};

SCP.Model.prototype.add = function(node) {
  var self = this;
  var isProcessDeferred = this.isProcess(node);
  var isOperatorDeferred = this.isOperator(node);
  isProcessDeferred.promise()
    .done(function() {
      self.setProcess(node)
    });
  isOperatorDeferred.promise()
    .done(function() {
      console.log("operator");
      self.addOperator(node);
    });
};

SCP.Model.prototype.isProcess = function(process) {
  var deferred = $.Deferred();
  window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_F, [
    SCP.keynodes.get('scp_process'),
    sc_type_arc_pos_const_perm,
    process
  ])
    .done(function(array) {
      if (array.length > 0)
        deferred.resolve();
      else
        deferred.reject();
    })
    .fail(deferred.reject);
  return deferred;
};

SCP.Model.prototype.isOperator = function(operator) {
  return this.getOperatorType(operator);
};

SCP.Model.prototype.addOperator = function(operator) {
  var deferred = $.Deferred();
  var self = this;
  this.graph.nodes[operator] = {};
  $.when(
    this.getOperatorType(operator),
    this.checkIfInitial(operator),
    this.checkIfBreakpoint(operator),
    this.checkIfPaused(operator),
    this.findIncomingTransitions(operator),
    this.findOutcomingTransitions(operator)
  )
    .done(function(type, initial, breakpoint, paused, incoming, outcoming) {
      self.graph.nodes[operator].type = SCP.keynodes.getIdentifierByAddress(type)
      self.graph.nodes[operator].initial = initial;
      self.graph.nodes[operator].breakpoint = breakpoint;
      self.graph.nodes[operator].paused = paused;
      self.addIncomingTransitions(operator, incoming);
      self.addOutcomingTransitions(operator, outcoming);
      self.notify();
    })
    .fail(deferred.reject);
  return deferred;
};

SCP.Model.prototype.getOperatorType = function(operator) {
  var deferred = $.Deferred();
  window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3A_A_F, [
    sc_type_node | sc_type_const,
    sc_type_arc_pos_const_perm,
    operator
  ])
    .done(function(array) {
      var deferreds = [];
      for(var i = 0; i < array.length; i++)
        deferreds.push($.Deferred());
      var type;
      $(array).each(function(index, element) {
        var node = element[0];
        window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_F, [
          SCP.keynodes.get('scp_operator_atomic_type'),
          sc_type_arc_pos_const_perm,
          node
        ])
          .done(function(array) {
            type = node;
            deferreds[index].resolve();
          })
          .fail(deferreds[index].resolve)
      }).promise()
        .done(function() {
          $.when.apply($, deferreds).done(function() {
            if (type)
              deferred.resolve(type);
            else
              deferred.reject();
          });
        });
    })
    .fail(deferred.reject);
  return deferred;
};

SCP.Model.prototype.findIncomingTransitions = function(operator) {
  var deferred = $.Deferred();
  var deferreds = [];
  deferreds[0] = this.findIncomingTransitionsOfAType(operator, 'nrel_goto');
  deferreds[1] = this.findIncomingTransitionsOfAType(operator, 'nrel_then');
  deferreds[2] = this.findIncomingTransitionsOfAType(operator, 'nrel_else');
  $.when.apply($, deferreds).done(function() {
    result = [];
    for(var i = 0; i < arguments.length; i++)
      result = result.concat(arguments[i]);
    deferred.resolve(result);
  });
  return deferred;
};

SCP.Model.prototype.findOutcomingTransitions = function(operator) {
  var deferred = $.Deferred();
  var deferreds = [];
  deferreds[0] = this.findOutcomingTransitionsOfAType(operator, 'nrel_goto');
  deferreds[1] = this.findOutcomingTransitionsOfAType(operator, 'nrel_then');
  deferreds[2] = this.findOutcomingTransitionsOfAType(operator, 'nrel_else');
  $.when.apply($, deferreds).done(function() {
    result = [];
    for(var i = 0; i < arguments.length; i++)
      result = result.concat(arguments[i]);
    deferred.resolve(result);
  });
  return deferred;
};

SCP.Model.prototype.addIncomingTransitions = function(operator, transitions) {
  for(var i = 0; i < transitions.length; i++) {
    var node = transitions[i][0];
    if (this.graph.nodes[node] && this.graph.nodes[node].push)
      this.graph.edges[node].push({
        target: operator,
        type: SCP.keynodes.getIdentifierByAddress(transitions[i][4])
      });
  }
};


SCP.Model.prototype.addOutcomingTransitions = function(operator, transitions) {
  this.graph.edges[operator] = [];
  for(var i = 0; i < transitions.length; i++) {
    var node = transitions[i][2];
    if (this.graph.nodes[node])
      this.graph.edges[operator].push({
        target: node,
        type: SCP.keynodes.getIdentifierByAddress(transitions[i][4])
      });
  }
};

SCP.Model.prototype.findIncomingTransitionsOfAType = function(operator, type) {
  var deferred = $.Deferred();
  window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_5A_A_F_A_F, [
    sc_type_node | sc_type_const,
    sc_type_const | sc_type_arc_common,
    operator,
    sc_type_arc_pos_const_perm,
    SCP.keynodes.get(type)
  ])
    .done(function(array) {
      deferred.resolve(array);
    })
    .fail(function() {
      deferred.resolve([])
    });
  return deferred;
};


SCP.Model.prototype.findOutcomingTransitionsOfAType = function(operator, type) {
  var deferred = $.Deferred();
  window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_5F_A_A_A_F, [
    operator,
    sc_type_const | sc_type_arc_common,
    sc_type_node | sc_type_const,
    sc_type_arc_pos_const_perm,
    SCP.keynodes.get(type)
  ])
    .done(function(array) {
      deferred.resolve(array);
    })
    .fail(function() {
      deferred.resolve([])
    });
  return deferred;
};

SCP.Model.prototype.checkIfPaused = function(operator) {
  var deferred = $.Deferred();
  window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3A_A_F, [
    sc_type_node | sc_type_const,
    sc_type_arc_pos_const_perm,
    operator
  ])
    .done(function(array) {
      for(var i = 0; i < array.length; i++) {
        var node = array[i][0];
        if (node == SCP.keynodes.get('scp_paused_operator')) {
          deferred.resolve(true);
          return;
        }
      }
      deferred.resolve(false);
    })
  return deferred;
};

SCP.Model.prototype.checkIfBreakpoint = function(operator) {
  var deferred = $.Deferred();
  window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3A_A_F, [
    sc_type_node | sc_type_const,
    sc_type_arc_pos_const_perm,
    operator
  ])
    .done(function(array) {
      for(var i = 0; i < array.length; i++) {
        var node = array[i][0];
        if (node == SCP.keynodes.get('breakpoint')) {
          deferred.resolve(true);
          return;
        }
      }
      deferred.resolve(false);
    })
  return deferred;
};

SCP.Model.prototype.checkIfInitial = function(operator) {
  var deferred = $.Deferred();
  window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_5A_A_F_A_F, [
    sc_type_node | sc_type_const,
    sc_type_arc_pos_const_perm,
    operator,
    sc_type_arc_pos_const_perm,
    SCP.keynodes.get('rrel_init')
  ])
    .done(function(array) {
      deferred.resolve(true);
    })
    .fail(function() {
      deferred.resolve(false);
    });
  return deferred;
};

SCP.Model.prototype.remove = function(node) {
  //TODO implement
  this.notify();
};

SCP.Model.prototype.subscribe = function(subscriber) {
  this.subscribers.push(subscriber);
};

SCP.Model.prototype.notify = function() {
  for(var i = 0; i < this.subscribers.length; i++)
    this.subscribers[i].update(this);
};

SCP.Model.prototype.update = function() {
  var nodes = this.graph.nodes;
  this.initGraph();
  for(var node in nodes)
    this.add(node);
};
//TODO add operator object

/* --- src/scp-agent.js --- */
SCP.Agent = function(question, args) {
  this.setQuestion(question);
  this.setArguments(args);
};

SCP.Agent.prototype.setQuestion = function(question) {
  this.question = question;
};

SCP.Agent.prototype.setArguments = function(args) {
  this.args = args;
};

SCP.Agent.prototype.run = function() {
  var self = this;
  var deferred = $.Deferred();
  this.createAgentNode().promise()
    .done(function(node) {
      self.agentNode = node;
      self.createAgentNodeSurrounding()
        .done(function() {
          self.startAgent().promise()
            .done(function() {
              self.waitForAnswer()
                .done(deferred.resolve)
            });
        });
    });
  return deferred;
};

SCP.Agent.prototype.createAgentNode = function() {
  return window.sctpClient.create_node(sc_type_const | sc_type_node);
};

SCP.Agent.prototype.createAgentNodeSurrounding = function() {
  var self = this;
  var deferred = $.Deferred();
  this.addToQuestionSet()
    .done(function() {
      self.addToSpecifiedQuestionSet()
        .done(function() {
          self.createArgs()
            .done(deferred.resolve);
        });
    })
  return deferred;
};

SCP.Agent.prototype.addToQuestionSet = function() {
  return window.sctpClient.create_arc(
    sc_type_arc_pos_const_perm, 
    SCP.keynodes.get('question'), 
    this.agentNode
  );
};

SCP.Agent.prototype.addToSpecifiedQuestionSet = function() {
  return window.sctpClient.create_arc(
    sc_type_arc_pos_const_perm, 
    SCP.keynodes.get(this.question), 
    this.agentNode
  );
};

SCP.Agent.prototype.createArgs = function() {
  var self = this;
  var deferreds = [];
  for(var i = 0; i < this.args.length; i++)
    deferreds.push($.Deferred());
  $(this.args).each(function(index, argument) {
    var rrel = SCP.keynodes.get("rrel_" + (index + 1));
    window.sctpClient.create_arc(
      sc_type_arc_pos_const_perm, 
      self.agentNode, 
      argument
    ).done(function(arc) {
      window.sctpClient.create_arc(
        sc_type_arc_pos_const_perm, 
        rrel, 
        arc
      )
        .done(deferreds[index].resolve)
        .fail(function() {
          console.log(arguments);
        })
    });
  });
  return $.when.apply($, deferreds);
};

SCP.Agent.prototype.startAgent = function() {
  return window.sctpClient.create_arc(
    sc_type_arc_pos_const_perm, 
    SCP.keynodes.get('question_initiated'), 
    this.agentNode
  );
};

SCP.Agent.prototype.waitForAnswer = function() {
  var deferred = $.Deferred();
  var process = setTimeout(function() {
    // window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_F, [
    //   SCP.keynodes.get('question_finished'),
    //   sc_type_arc_pos_const_perm,
    //   this.agentNode
    // ])
    //   .done(function() {
    //     clearTimeout(process);
    //     deferred.resolve();
    //   })
    deferred.resolve();
  }, 5000);
  return deferred;
};

/* --- src/scp-bundle.js --- */
SCP.Bundle = function(options) {
  this.setNamespace(options.namespace);
  this.setModel(options.model);
  this.setContainer(options.container);
  this.initView();
  this.initController();
}

SCP.Bundle.prototype.setNamespace = function(namespace) {
  this.namespace = namespace;
};

SCP.Bundle.prototype.setModel = function(model) {
  this.model = model;
};

SCP.Bundle.prototype.setContainer = function(container) {
  this.container = container;
};

SCP.Bundle.prototype.initView = function() {
  this.view = new this.namespace.View(this.container);
  var subscriber = new this.namespace.Subscriber(this.view);
  this.model.subscribe(subscriber);
};

SCP.Bundle.prototype.initController = function() {
  this.controller = new this.namespace.Controller(this.model);
  this.view.control(this.controller);
};

/* --- src/graph/scp-graph-view.js --- */
SCP.Graph.View = function(container) {
  this.setContainer(container);
  this.initGraph();
}

SCP.Graph.View.prototype.setContainer = function(container) {
  var newContainer = $("<div class='graph'></div>");
  $("#" + container).append(newContainer);
  this.container = newContainer;
};

SCP.Graph.View.prototype.initGraph = function() {
  this.initCytoscape();
  this.initGraphEvents();
};

SCP.Graph.View.prototype.initCytoscape = function() {
  this.graph = cytoscape({
    container: this.container,
    boxSelectionEnabled: false,
    autounselectify: true,
    style: SCP.Graph.View.STYLES
  });
};

SCP.Graph.View.prototype.initGraphEvents = function() {
  var self = this;
  this.graph.on('tap', 'node', function(event) {
    var target = event.cyTarget;
    self.controller.setCurrentOperator(target.data().id);
  });
};

SCP.Graph.View.prototype.control = function(controller) {
  this.controller = controller;
};

SCP.Graph.View.STYLES = [
  {
    selector: 'node',
    style: {
      'height': 20,
      'width': 20,
      'background-color': '#ccc',
      'label': 'data(type)'
    }
  },
  {
    selector: 'edge',
    style: {
      'label': 'data(type)',
      'edge-text-rotation': 'autorotate'
    }
  },
  {
    selector: '.initial',
    style: {
      'background-color': 'green',
    }
  },
  {
    selector: '.paused',
    style: {
      'background-color': 'red',
    }
  },
  {
    selector: '.selected',
    style: {
      'width': 30,
      'height': 30
    }
  },
  {
    selector: '.breakpoint',
    style: {
      'border-width': '5px'
    }
  }
];

/* --- src/graph/scp-graph-controller.js --- */
SCP.Graph.Controller = function(model) {
  this.setModel(model);
}

SCP.Graph.Controller.prototype.setModel = function(model) {
  this.model = model;
};

SCP.Graph.Controller.prototype.setCurrentOperator = function(currentOperator) {
  this.model.setCurrentOperator(currentOperator);
};

/* --- src/graph/scp-graph-subscriber.js --- */
SCP.Graph.Subscriber = function(graph) {
  this.setGraph(graph);
}

SCP.Graph.Subscriber.prototype.setGraph = function(graph) {
  this.graph = graph;
};

SCP.Graph.Subscriber.prototype.update = function(model) {
  this.clearGraph();
  this.addNodes(model);
  this.addEdges(model);
  this.highlightSelected(model);
  this.runLayout();
};

SCP.Graph.Subscriber.prototype.clearGraph = function(model) {
  var graph = this.graph.graph;
  graph.remove("*");
};

SCP.Graph.Subscriber.prototype.addNodes = function(model) {
  var graph = this.graph.graph;
  var nodes = model.graph.nodes;
  for(var node in nodes) {
    var createdNode = {group: 'nodes', classes: '', data: {}};
    createdNode.data.id = node;
    createdNode.data.type = nodes[node].type;
    if (nodes[node].initial)
      createdNode.classes += " initial";
    if (nodes[node].paused)
      createdNode.classes += " paused";
    if (nodes[node].breakpoint)
      createdNode.classes += " breakpoint";
    graph.add(createdNode);
  }
};

SCP.Graph.Subscriber.prototype.addEdges = function(model) {
  var graph = this.graph.graph;
  var edges = model.graph.edges;
  for(var edge in edges) {
    for(var i = 0; i < edges[edge].length; i++) {
      var createdEdge = {group: 'edges'};
      createdEdge.data = edges[edge][i];
      createdEdge.data.source = edge;
      graph.add(createdEdge);
    }
  }
};

SCP.Graph.Subscriber.prototype.highlightSelected = function(model) {
  var currentOperatorNode = this.graph.graph.getElementById(model.getCurrentOperator());
  currentOperatorNode.addClass("selected");
};

SCP.Graph.Subscriber.prototype.runLayout = function() {
  this.graph.graph.elements().layout({ name: 'grid' });
};

/* --- src/controls/scp-controls-view.js --- */
SCP.Controls.View = function(container) {
  this.setContainer(container);
  this.initButtons();
};

SCP.Controls.View.prototype.setContainer = function(container) {
  var newContainer = $("<div class='controls form-inline'></div>");
  $("#" + container).append(newContainer);
  this.container = newContainer;
};

SCP.Controls.View.prototype.initButtons = function() {
  this.initContinueButton();
  this.initGoToNextButton();
  this.initToggleBreakpointButton();
  this.initUpdateButton();
};

//Add btn initialization to the single method
SCP.Controls.View.prototype.initContinueButton = function() {
  var button = $("<button class='btn btn-primary btn-space'><i class='glyphicon glyphicon-play'></i></button>");
  var self = this;
  this.container.append(button);
  button.click(function() {
    self.controller.continue();
  });
  this.continueButton = button;
};

SCP.Controls.View.prototype.initGoToNextButton = function() {
  var button = $("<button class='btn btn-primary btn-space'><i class='glyphicon glyphicon-step-forward'></i></button>");
  var self = this;
  this.container.append(button);
  button.click(function() {
    self.controller.goToNext();
  });
  this.goToNextButton = button;
};

SCP.Controls.View.prototype.initToggleBreakpointButton = function() {
  var button = $("<button class='btn btn-primary btn-space'></button>");
  var self = this;
  this.container.append(button);
  button.click(function() {
    self.controller.toggleBreakpoint();
  });
  this.toggleBreakpointButton = button;
};

SCP.Controls.View.prototype.initUpdateButton = function() {
  var button = $("<button class='btn btn-primary'><i class='glyphicon glyphicon-repeat'></i></button>");
  var self = this;
  this.container.append(button);
  button.click(function() {
    self.controller.updateModel();
  });
  this.updateButton = button;
};


SCP.Controls.View.prototype.control = function(controller) {
  this.controller = controller;
};

SCP.Controls.View.prototype.toggleBreakpointIcon = function(isBreakpoint) {
  if (isBreakpoint)
    this.toggleBreakpointButton.html("<i class='glyphicon glyphicon-ok'></i>");
  else
    this.toggleBreakpointButton.html("<i class='glyphicon glyphicon-remove'></i>");
};

/* --- src/controls/scp-controls-controller.js --- */
SCP.Controls.Controller = function(model) {
  this.setModel(model);
}

SCP.Controls.Controller.prototype.setModel = function(model) {
  this.model = model;
};

SCP.Controls.Controller.prototype.continue = function() {
  this.callAgent("question_unpausing_paused_operator", [this.model.getCurrentOperator()]);
};

SCP.Controls.Controller.prototype.goToNext = function() {
  this.callAgent('question_transition_to_next_operator', [this.model.getCurrentOperator()]);
};

SCP.Controls.Controller.prototype.toggleBreakpoint = function() {
  this.callAgent('question_adding_breakpoint', [this.model.getCurrentOperator(), this.model.getProcess()]);
};

SCP.Controls.Controller.prototype.callAgent = function(question, arguments) {
  var self = this;
  new SCP.Agent(question, arguments).run().promise().done(function() {
    self.model.update();
  });
};

SCP.Controls.Controller.prototype.updateModel = function() {
  this.model.update();
};

/* --- src/controls/scp-controls-subscriber.js --- */
SCP.Controls.Subscriber = function(controls) {
  this.setControls(controls);
}

SCP.Controls.Subscriber.prototype.setControls = function(controls) {
  this.controls = controls;
};

SCP.Controls.Subscriber.prototype.update = function(model) {
  var current = model.getCurrentOperator();
  var graph = model.getGraph();
  this.controls.toggleBreakpointIcon(!graph.nodes[current] || !graph.nodes[current].breakpoint);
};

/* --- src/scp-viewer.js --- */
SCP.Viewer = function(sandbox) {
  var self = this;
  this.setSandbox(sandbox);
  this.initContainer();
  this.initModel();
  this.initGraph();
  this.initControls();
  this.initEvents();
  SCP.keynodes.deferred.promise()
    .done(function() {
      self.sandbox.updateContent();
      self.model.notify();
    });
}

SCP.Viewer.prototype.setSandbox = function(sandbox) {
  this.sandbox = sandbox;
};

SCP.Viewer.prototype.initContainer = function(container) {
  this.container = this.sandbox.container
};

SCP.Viewer.prototype.initModel = function() {
  this.model = new SCP.Model();
};

SCP.Viewer.prototype.initGraph = function() {
  this.graph = new SCP.Bundle({
    namespace: SCP.Graph,
    model: this.model,
    container: this.container,
  });
};

SCP.Viewer.prototype.initControls = function() {
  this.controls = new SCP.Bundle({
    namespace: SCP.Controls,
    model: this.model,
    container: this.container,
  });
};

SCP.Viewer.prototype.initEvents = function() {
  this.sandbox.eventStructUpdate = $.proxy(this.eventStructUpdate, this);
};

SCP.Viewer.prototype.eventStructUpdate = function(added, contour, arc) {
  var self = this;
  window.sctpClient.get_arc(arc)
    .done(function(array) {
      if (added)
        self.updateAfterAddition(array[1]);
      else
        self.updateAfterDeletion(array[1]);
    });
}

SCP.Viewer.prototype.updateAfterAddition = function(node) {
  this.model.add(node);
}

SCP.Viewer.prototype.updateAfterDeletion = function(node) {
  this.model.remove(node);
};

/* --- src/scp-component.js --- */
SCP.Component = {
  ext_lang: 'scp_debugger_view',
  formats: ['format_scp_debugger'],
  struct_support: true,
  factory: function(sandbox) {
    SCP.keynodes = new SCP.Keynodes();
    SCP.keynodes.deferred = SCP.keynodes.init();
    return new SCP.Viewer(sandbox);
  }
};

SCWeb.core.ComponentManager.appendComponentInitialize(SCP.Component);

