# -*- coding: utf-8 -*-
from sctp.types import ScElementType, SctpIteratorType
import arrow

from sctp.client import SctpClient


class StationScWriter:
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

    def stations(self):
        trains_with_stations = {}
        sc_node = self.sctp_client.find_element_by_system_identifier('concept_railway_train')
        nrel_station = self.sctp_client.find_element_by_system_identifier('nrel_rw_train_route')

        trains = self.sctp_client.iterate_elements(
            SctpIteratorType.SCTP_ITERATOR_3F_A_A,
            sc_node,
            ScElementType.sc_type_arc_pos_const_perm,
            ScElementType.sc_type_node | ScElementType.sc_type_const)
        print len(trains)
        for train in trains:
            train_name = self.get_russian_name(train[2])
            trains_with_stations[train_name] = []
            station_sets = self.sctp_client.iterate_elements(
                SctpIteratorType.SCTP_ITERATOR_5F_A_A_A_F,
                train[2],
                ScElementType.sc_type_arc_common | ScElementType.sc_type_const,
                ScElementType.sc_type_node | ScElementType.sc_type_const,
                ScElementType.sc_type_arc_pos_const_perm,
                nrel_station
            )
            for station_set in station_sets:
                stations = self.sctp_client.iterate_elements(
                    SctpIteratorType.SCTP_ITERATOR_3F_A_A,
                    station_set[2],
                    ScElementType.sc_type_arc_pos_const_perm,
                    ScElementType.sc_type_node | ScElementType.sc_type_const)
                for station in stations:
                    station_name = self.get_russian_name(station[2])
                    if station_name not in trains_with_stations[train_name]:
                        trains_with_stations[train_name].append(station_name)
        return trains_with_stations

    def find_path(self):
        trains = self.stations()
        first_station = "Минск-Северный".decode('utf-8')
        second_station = "Масюковщина".decode('utf-8')
        for train, stations in trains.items():
            if first_station in stations and second_station in stations:
                print train

    def get_russian_name(self, sc_node):
        nrel_main_idtf = self.sctp_client.find_element_by_system_identifier('nrel_main_idtf')
        russian = self.sctp_client.find_element_by_system_identifier('lang_ru')
        identifier = self.sctp_client.iterate_elements(
            SctpIteratorType.SCTP_ITERATOR_5F_A_A_A_F,
            sc_node,
            ScElementType.sc_type_arc_common | ScElementType.sc_type_const,
            ScElementType.sc_type_link,
            ScElementType.sc_type_arc_pos_const_perm,
            nrel_main_idtf
        )
        if identifier is not None:
            for res in identifier:
                idtf_addr = res[2]

                # check if founded main identifier is for used language
                langs = self.sctp_client.iterate_elements(
                    SctpIteratorType.SCTP_ITERATOR_3F_A_F,
                    russian,
                    ScElementType.sc_type_arc_pos_const_perm,
                    idtf_addr
                )
                idtf_value = self.sctp_client.get_link_content(idtf_addr)
                idtf_value = idtf_value.decode('utf-8')
                return idtf_value


def main():
    writer = StationScWriter()
    writer.find_path()

if __name__ == '__main__':
    main()
