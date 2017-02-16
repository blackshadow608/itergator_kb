# -*- coding: utf-8 -*-


import tornado.options
import tornado.web
import json
import base
import httplib2
from sctp.tests import Convert

class Todo(tornado.web.RequestHandler):
    def post(self):
        url = self.get_argument('url',  None, True)
        password = self.get_argument('password',  None, True)
        h = httplib2.Http(".cache")
        resp, content = h.request(url, "GET")
        self.write(content)




class Write(tornado.web.RequestHandler):
    def post(self):
        j = self.get_argument('json',  None, True)
        service = self.get_argument('service',  None, True)
        Convert().c(service, j)
        self.write("done")


