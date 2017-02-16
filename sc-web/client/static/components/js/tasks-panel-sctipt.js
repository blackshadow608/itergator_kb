function synchronizeTasksPanel() {
	window.sctpClient.find_element_by_system_identifier('to_do_list').done(function (list_addr) {
		window.scHelper.getSetElements(list_addr).done(function (list_elements_addresses) {
			$('#tasks-table tbody').remove();
			var out = '<thead><tr><th>The list of events:</th></tr></thead>';
			for (i = 0; i < list_elements_addresses.length; i++) {
				window.scHelper.getIdentifier(list_elements_addresses[i], scKeynodes.lang_ru).done(function (idtf) {
					out += "<tr><td>" + idtf + "</td></tr>";
					document.getElementById("tasks-table").innerHTML = out;
				});
			}
		});
	});
}

function addNewEventToKnowledgeBase() {
	var data = $('#new-task-input').val();
	if (data) {
		window.sctpClient.find_element_by_system_identifier('to_do_list').done(function (list_addr) {
			window.sctpClient.create_node(sc_type_node | sc_type_const | sc_type_node_abstract).done(function (node_addr) {
				window.sctpClient.create_arc(sc_type_arc_pos_const_perm, list_addr, node_addr).done(function (arc_addr) {
					window.sctpClient.create_link().done(function (linkAddr) {
						window.sctpClient.set_link_content(linkAddr, data).done(function () {
							window.sctpClient.create_arc((sc_type_arc_common | sc_type_const), node_addr, linkAddr).done(function (arcAddr) {
								window.sctpClient.create_arc(sc_type_arc_pos_const_perm, window.scKeynodes.nrel_main_idtf, arcAddr);
							});
							window.sctpClient.create_arc(sc_type_arc_pos_const_perm, window.SCWeb.core.Server._current_language, linkAddr).done(function () {
								window.SCWeb.core.Server.resolveIdentifiers([node_addr], function () { return; });
								synchronizeTasksPanel();
								document.getElementById('new-task-input').value = '';
								/*window.sctpClient.find_element_by_system_identifier('to_do_list').done(function (list_addr) {
									window.scHelper.getSetElements(list_addr).done(function (list_elements_addresses) {
										$('#tasks-table tbody').remove();
										location.reload();
									});
 									document.getElementById('new-task-input').value = '';
									window.SCWeb.core.Server.resolveIdentifiers([node_addr], function () { return; });
								});*/
                            });
                        });
                    });
                });
            });
        });
    }
}

function postEvent() {
	var name = $('#nameInput').val();
	var startDate = $('#startInput').val();
	var endDate = $('#endInput').val();
	$.post("api/create_event?name=" + name  + "&startDate=" + startDate + "&endDate=" +endDate);
}
