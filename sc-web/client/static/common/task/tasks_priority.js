function asd(){

    var priorities = [];
    var nrel_priority_addr;

    function taskChecker(res, sctp_client) {          
        check(sctp_client, res);
        
    }

    function priorityChecker(res, sctp_client) {          
        priorityList(sctp_client, res);
        
    }

    function findElement(identifier, successFunction){
        SctpClientCreate().done(function(client) {finder(client, identifier, successFunction)});
    }

    function finder(sctp_client, identifier, successFunction) {
        var dfd = new jQuery.Deferred();
        sctp_client.find_element_by_system_identifier(identifier).done(function(res){            
            successFunction(res, sctp_client);   
            dfd.resolve(res);         
        }).fail(function() {
            throw "Can't resolve keynode " + identifier;
            dfd.reject();
        });
        
        return dfd.promise();
    };

    function check(sctp_client, addr){
        var dfd = new jQuery.Deferred();
        sctp_client.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_A,
                                          [
                                              addr,
                                              sc_type_arc_pos_const_perm,
                                              sc_type_node | sc_type_const
                                          ])
        .done(function (res) {
            var langs = [];
            console.log(res);
            for (r in res) {                
                getIdtf(res[r][2], function(idtf, addr) {
                    // console.log('CHILD: ' + 'identifier' + ' = ' + idtf);
                    $('.task-table tbody').append('<tr sc-addr=' + addr + '><td>' + idtf + '</td><td><select class="form-control task-priority">'+
                        
                    '</select></td></tr>');
                });
            }
            
            dfd.resolve(langs);
            
        }).fail(function () {
            dfd.reject();
        });
        
        return dfd.promise();
    }

    function priorityList(sctp_client, addr){
        var dfd = new jQuery.Deferred();
        // var curr_addr = addr;
        sctp_client.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_A,
                                          [
                                              addr,
                                              sc_type_arc_pos_const_perm,
                                              sc_type_node | sc_type_const
                                          ])
        .done(function (res) {
            var langs = [];
            for (r in res) {                
                getIdtf(res[r][2], function(idtf, addr) {
                    console.log('PRIORITY CHILD: ' + 'identifier' + ' = ' + idtf);
                    // $('.task-table tbody').append('<tr><td>' + idtf + '</td><td></td></tr>');
                    var priorityList = $('.task-priority');
                    priorityList.empty();
                    priorities.push({idtf: idtf, address: addr});
                    $.each(priorities, function(index, value){
                        priorityList.append('<option sc_addr="'+ value.address+'">'+ value.idtf +'</option>');
                    });
                });
            }
            
            dfd.resolve(langs);
            
        }).fail(function () {
            dfd.reject();
        });
        
        return dfd.promise();
    }


    var getIdtf = function(addr, callback) {
        SCWeb.core.Server.resolveIdentifiers([addr], function(idtfs) {
            callback(idtfs[addr], addr);
        });
    };

    $(document).off('click','.tasks-priority');
    $(document).on('click','.tasks-priority', function(){
        $('.task-table tbody').empty();
        findElement('task', taskChecker);
        findElement('priority', priorityChecker);
        getNrelPriorityNode()
    });

    function getNode(sctp_client, identifier){
        var dfd = new jQuery.Deferred();
        sctp_client.find_element_by_system_identifier(identifier).done(function(res) {
            nrel_priority_addr = res;
            console.log('NREL: ' + identifier + ' = ' + res);
            dfd.resolve(res);
        }).fail(function() {
            throw "Can't resolve keynode NREL" + identifier;
            dfd.reject();
        });
        
        return dfd.promise();
    }

    function getNrelPriorityNode(){
        SctpClientCreate().done(function(client) {getNode(client, 'nrel_priority')});
    }    
    $('.save_priority').on('click', function(){
        
        SctpClientCreate().done(function(client) {
            var rows = $('.task-table tr[sc-addr]');
            $.each(rows, function(index, value){
                var task = $(value).attr('sc-addr');
                var prior = $(value).children('td').children('select').find(":selected").attr('sc_addr');
            // console.log($(value).attr('sc-addr'), $(value).children('td').children('select').children('option').attr('sc_addr'));
                client.create_arc(sc_type_const | sc_type_edge_common, task, prior).done(
                    function(arc_addr){
                        client.create_arc(sc_type_arc_pos_const_perm, nrel_priority_addr, arc_addr);
                    });
            });
        });
        

    });
}

asd();