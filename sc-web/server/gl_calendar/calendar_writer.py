from sctp.types import ScElementType
import arrow

from sctp.client import SctpClient


class CalendarScWriter:
    sctp_client = SctpClient()

    def __init__(self):
        self.set_sctp_settings()

    def get_or_create_sc_node(self, sc_type, sc_idtf):
        sc_idtf = str(sc_idtf)
        sc_node = self.sctp_client.find_element_by_system_identifier(sc_idtf)
        if not sc_node:
            sc_node = self.sctp_client.create_node(sc_type)
            self.sctp_client.set_system_identifier(sc_node, sc_idtf)
            if sc_idtf.isdigit():
                number = self.sctp_client.find_element_by_system_identifier('integer')
                self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, number, sc_node)
        return sc_node

    def set_sctp_settings(self):
        self.sctp_client.initialize('127.0.0.1', 55770)

    def calendar_parse(self, events):
        user = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_const, 'user')
        google_calendar = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_const,
            'Google_calendar')
        calendar = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_const,
            'user_calendar')
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, google_calendar, calendar)
        decomposition = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
            'nrel_decomposition')
        calendar_events_node = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const,
                                                            'user_calendar_events')
        dec_arc = self.sctp_client.create_arc(ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                              calendar_events_node, calendar)
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, decomposition, dec_arc)

        for event in events:
            event_name = event['summary']
            start_datetime = arrow.get(event['start'].get('dateTime', event['start'].get('date'))).datetime
            sc_start_date_construction = self.build_date_construction(start_datetime)
            end_datetime = arrow.get(event['end'].get('dateTime', event['end'].get('date'))).datetime
            sc_end_date_construction = self.build_date_construction(end_datetime)
            event = self.build_event_construction(event_name, sc_start_date_construction, sc_end_date_construction)
            self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, calendar_events_node, event)



    def create_link(self):
        node = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_class | ScElementType.sc_type_const, 'Elementary')
        lnk = self.sctp_client.create_link()
        res = self.sctp_client.set_link_content(lnk, 'True text off link')
        print res
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, lnk)

    def build_event_construction(self, event_name, start_date, end_date):
        event = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_const, event_name)
        event_start_date_relation = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const, 'nrel_start_event_date')
        event_end_date_relation = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const, 'nrel_end_event_date')
        start_relation_arc = self.sctp_client.create_arc(ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                         event, start_date)
        end_relation_arc = self.sctp_client.create_arc(ScElementType.sc_type_const | ScElementType.sc_type_edge_common,
                                                       event, end_date)
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, event_start_date_relation, start_relation_arc)
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, event_end_date_relation, end_relation_arc)
        return event

    def build_date_construction(self, date):
        """
        Get node of date
        :param date: datetime object
        :return: day node
        """
        date_class = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_class | ScElementType.sc_type_const, 'date')
        geregorian_calendar = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_norole | ScElementType.sc_type_const,
            'nrel_geregorian_calendar')
        node = self.sctp_client.create_node(ScElementType.sc_type_node | ScElementType.sc_type_const)
        date_class_arc = self.sctp_client.create_arc(ScElementType.sc_type_const | ScElementType.sc_type_edge_common, date_class, node)
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, geregorian_calendar, date_class_arc)
        day = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const, date.day)
        month = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const, date.month)
        year = self.get_or_create_sc_node(ScElementType.sc_type_node | ScElementType.sc_type_const, date.year)
        month_norole = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_role | ScElementType.sc_type_const,
            "rrel_the_month_of_the_year")
        year_norole = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_role | ScElementType.sc_type_const,
            "rrel_number_of_the_year")
        day_norole = self.get_or_create_sc_node(
            ScElementType.sc_type_node | ScElementType.sc_type_node_role | ScElementType.sc_type_const,
            "rrel_number_of_the_day_in_the_month")
        month_arc = self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, month)
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, month_norole, month_arc)
        day_arc = self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, day)
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, day_norole, day_arc)
        year_arc = self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, node, year)
        self.sctp_client.create_arc(ScElementType.sc_type_arc_pos_const_perm, year_norole, year_arc)

        return node
