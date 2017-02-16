from client import *
from urllib2 import urlopen
import json
import sys

from sctp.types import ScElementType


class Convert:
    tezt = SctpClient()
    servise_name = ''
    data = ''

    def get_or_create_sc_node(self, sc_type, sc_idtf, client_instace):
        sc_node = client_instace.find_element_by_system_identifier(sc_idtf)
        if not sc_node:
            sc_node = client_instace.create_node(sc_type)
            client_instace.set_system_identifier(sc_node, sc_idtf)
        return sc_node

    def c(self, service_name, data):
        print service_name
        service_name = str(service_name)
        self.servise_name = service_name
        self.data = data
        self.tezt.initialize('127.0.0.1', 55770)
        aseet = json.loads(data)
        user = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const, 'user',
            self.tezt)
        self.tezt.set_system_identifier(
            self.tezt.create_node(
                ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const),
            service_name + " profile*")

        node = self.tezt.create_node(ScElementType.sc_type_node | ScElementType.sc_type_const)
        self.tezt.set_system_identifier(node, service_name + " profile current user")

        root_sc_addr = user

        relation_node = self.tezt.find_element_by_system_identifier(service_name + " profile*")
        relation_edge = self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, relation_node,
                                             self.tezt.create_arc(
                                                 ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                 root_sc_addr, node))

        if service_name == 'google-tasks':
            task_s = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const, 'Task lists',
                                                self.tezt)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, task_s)
            self.create_google_tasks(task_s, aseet)
        if service_name == 'todoist':
            task_s = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const, 'Task lists',
                                                self.tezt)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, task_s)
            self.create_todoist(task_s, aseet)
        if service_name == 'facebook':
            self.create_facebook(node, aseet)
        if service_name == 'google-tasks-list':
            self.create_google_list(node, aseet)
        if service_name == 'dropbox':
            self.create_dropbox(node, aseet)
        else:
            pass

        self.tezt.shutdown()

    def make_str(self, value):
        if isinstance(value, unicode):
            value = value.encode('utf-8')
        if isinstance(value, int):
            value = str(value)
        return value

    def create_relation_from(self, node, value, name_rel):
        task_id_relation = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
            name_rel, self.tezt)
        task_id = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                             value, self.tezt)
        relation_edge = self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_id_relation,
                                             self.tezt.create_arc(
                                                 ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                 node, task_id))
        return task_id

    def create_relation_to(self, node, value, name_rel):
        task_id_relation = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
            name_rel, self.tezt)
        task_id = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                             value, self.tezt)
        relation_edge = self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_id_relation,
                                             self.tezt.create_arc(
                                                 ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                 task_id, node))
        return task_id

    def create_dropbox(self, node, values):
        print values

    def create_google_list(self, node, values):
        name = values['list_name']
        task_system = self.tezt.find_element_by_system_identifier("task")
        name = self.make_str(name)
        list_node = self.tezt.find_element_by_system_identifier(name)
        tasks = values['tasks']
        for task in tasks:
            task_node = self.tezt.create_node(ScElementType.sc_type_node | ScElementType.sc_type_const)
            value = task['title']
            if value:
                value = self.make_str(value)
                self.tezt.set_system_identifier(task_node, value)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_system, task_node)
            inclusion = self.tezt.find_element_by_system_identifier('nrel_inclusion')
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, inclusion,
                                 self.tezt.create_arc(
                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                     list_node, task_node))
            value = task['selfLink']
            if value:
                value = self.make_str(value)
                self.create_relation_from(task_node, value, 'nrel_link')
            value = task['updated']
            if value:
                value = self.make_str(value)
                self.create_relation_from(task_node, value, 'nrel_service_task_last_update')
            value = task['id']
            if value:
                value = self.make_str(value)
                self.create_relation_from(task_node, value, 'nrel_service_task_id')
            value = task['status']
            if value:
                value = self.make_str(value)
                self.create_relation_from(task_node, value, 'nrel_service_task_status')

    def create_facebook(self, node, values):
        value = values['name']
        if value:
            value = self.make_str(value)
            self.create_relation_from(node, value, 'nrel_service_user_name')
        value = values['first_name']
        if value:
            value = self.make_str(value)
            self.create_relation_from(node, value, 'nrel_service_user_first_name')
        value = values['last_name']
        if value:
            value = self.make_str(value)
            self.create_relation_from(node, value, 'nrel_service_user_last_name')
        value = values['updated_time']
        if value:
            value = self.make_str(value)
            self.create_relation_from(node, value, 'nrel_service_user_last_update')
        value = values['link']
        if value:
            value = self.make_str(value)
            self.create_relation_from(node, value, 'nrel_service_user_link')
        value = values['id']
        if value:
            value = self.make_str(value)
            self.create_relation_from(node, value, 'nrel_service_user_id')

    def create_google_tasks(self, node, values):
        taskLists = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                               'Google task lists', self.tezt)
        self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, taskLists)
        for task_list in values['taskLists']:
            value = task_list['title']
            if isinstance(value, unicode):
                value = value.encode('utf-8')
            t_list = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                value.encode('utf-8'), self.tezt)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, taskLists, t_list)
            value = task_list['id']
            if isinstance(value, unicode):
                value = value.encode('utf-8')
            task_id_relation = self.get_or_create_sc_node(
                ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                'google-tasklist_id*', self.tezt)
            task_id = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                 value.encode('utf-8'), self.tezt)
            relation_edge = self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_id_relation,
                                                 self.tezt.create_arc(
                                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                     t_list, task_id))
            value = task_list['selfLink']
            if isinstance(value, unicode):
                value = value.encode('utf-8')
            task_id_relation = self.get_or_create_sc_node(
                ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                'google-tasklist_link*', self.tezt)
            task_id = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                 value.encode('utf-8'), self.tezt)
            relation_edge = self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_id_relation,
                                                 self.tezt.create_arc(
                                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                     t_list, task_id))

    def create_todoist(self, node, values):
        tasks = values['Items']
        projects = values['Projects']
        user = values['User']
        taskLists = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                               'Todoist task lists', self.tezt)
        self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, taskLists)
        for project in projects:
            value = project['name']
            if isinstance(value, unicode):
                value = value.encode('utf-8')
            t_list = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const, value,
                                                self.tezt)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, taskLists, t_list)
            value = project['id']
            value = self.make_str(value)
            task_id_relation = self.get_or_create_sc_node(
                ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                'todoist project id*', self.tezt)
            task_id = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                 value, self.tezt)
            relation_edge = self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_id_relation,
                                                 self.tezt.create_arc(
                                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                     t_list, task_id))

        for task in tasks:
            value = task['content']
            value = self.make_str(value)
            task_system = self.tezt.find_element_by_system_identifier("task")
            task_node = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const, value,
                                                   self.tezt)
            task_project = [project for project in projects if project['id'] == task['project_id']]
            task_project_node = self.tezt.find_element_by_system_identifier(self.make_str(task_project[0]['name']))
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_system, task_node)
            inclusion = self.tezt.find_element_by_system_identifier('nrel_inclusion')
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, inclusion,
                                 self.tezt.create_arc(
                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                     task_project_node, task_node))
            value = task['due_date']
            if value:
                value = self.make_str(value)
                task_finish_date_relation = self.get_or_create_sc_node(
                    ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                    'nrel_finish_date', self.tezt)
                task_date = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                       value, self.tezt)
                self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_finish_date_relation,
                                     self.tezt.create_arc(
                                         ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                         task_node, task_date))

            value = task['date_added']
            if value:
                value = self.make_str(value)
                task_creation_date_relation = self.get_or_create_sc_node(
                    ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                    'nrel_creation_date', self.tezt)
                task_date = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                       value, self.tezt)
                self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_creation_date_relation,
                                     self.tezt.create_arc(
                                         ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                         task_node, task_date))

        profile = self.tezt.find_element_by_system_identifier('todoist profile current user')
        value = user['join_date']
        if value:
            value = self.make_str(value)
            task_creation_date_relation = self.get_or_create_sc_node(
                ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                'nrel_joined_date', self.tezt)
            task_date = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                   value, self.tezt)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_creation_date_relation,
                                 self.tezt.create_arc(
                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                     profile, task_date))
        value = user['email']
        if value:
            value = self.make_str(value)
            task_creation_date_relation = self.get_or_create_sc_node(
                ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                'nrel_user_email', self.tezt)
            task_date = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                   value, self.tezt)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_creation_date_relation,
                                 self.tezt.create_arc(
                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                     profile, task_date))
        value = user['full_name']
        if value:
            value = self.make_str(value)
            task_creation_date_relation = self.get_or_create_sc_node(
                ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
                'nrel_service_user_name', self.tezt)
            task_date = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                   value, self.tezt)
            self.tezt.create_arc(ScElementType.sc_type_arc_pos_const_perm, task_creation_date_relation,
                                 self.tezt.create_arc(
                                     ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                     profile, task_date))
