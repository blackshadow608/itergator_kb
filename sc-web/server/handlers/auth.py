# -*- coding: utf-8 -*-
import os

import httplib2

import tornado.auth
import tornado.options
import tornado.web
import json

from apiclient import discovery
from oauth2client import client
from oauth2client import tools
from oauth2client.file import Storage

import base
import db

from keynodes import KeynodeSysIdentifiers, Keynodes
from sctp.logic import SctpClientInstance
from sctp.types import ScAddr, SctpIteratorType, ScElementType

import api_logic as logic

try:
	import argparse
	flags = argparse.ArgumentParser(parents=[tools.argparser]).parse_args()
except ImportError:
	flags = None

global services
services = []

class GoogleOAuth2LoginHandler(base.BaseHandler,
                               tornado.auth.GoogleOAuth2Mixin):
    def _loggedin(self, user):
               
        email = user['email']
        if len(email) == 0:
            return
        database = db.DataBase()
        u = database.get_user_by_email(email)

        key = None
        if u:
            key = database.create_user_key()
            u.key = key
            database.update_user(u)
        else:
            role = 0
            supers = tornado.options.options.super_emails
            if supers and (email in supers):
                r = database.get_role_by_name('super')
                if r:
                    role = r.id
            
            with SctpClientInstance() as sctp_client:
                keys = Keynodes(sctp_client)
            
                sc_session = logic.ScSession(self, sctp_client, keys)
                            
                key = database.add_user(name = user['name'], 
                                        email = email, 
                                        avatar = user['picture'],
                                        role = role)
                
        self.set_secure_cookie(self.cookie_user_key, key, 1)

    @tornado.gen.coroutine
    def get(self):
        googleCalendarAuth()
        self.settings[self._OAUTH_SETTINGS_KEY]['key'] = tornado.options.options.google_client_id
        self.settings[self._OAUTH_SETTINGS_KEY]['secret'] = tornado.options.options.google_client_secret

        print self.request.uri

        uri = 'http://' + tornado.options.options.host + ":" + str(tornado.options.options.port)
        uri += '/auth/google'

        if self.get_argument('code', False):
            user = yield self.get_authenticated_user(
                redirect_uri=uri,
                code=self.get_argument('code'))

            # Save the user with e.g. set_secure_cookie
            if not user:
                self.clear_all_cookies()
                raise tornado.web.HTTPError(500, 'Google authentication failed')

            access_token = str(user['access_token'])
            http_client = self.get_auth_http_client()
            response = yield http_client.fetch(
                'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + access_token)

            if not response:
                self.clear_all_cookies()
                raise tornado.web.HTTPError(500, 'Google authentication failed')
            user = json.loads(response.body)

            self._loggedin(user)

            googleCalendarAuth()
            self.redirect('/')

        else:
            yield self.authorize_redirect(
                redirect_uri=uri,
                client_id=self.settings['google_oauth']['key'],
                scope=['profile', 'email'],
                response_type='code',
                extra_params={'approval_prompt': 'auto'})
            
class LogOut(base.BaseHandler):
    
    @tornado.web.asynchronous
    def get(self):
        self.clear_cookie(self.cookie_user_key)
        self.redirect('/')


def get_credentials():
    SCOPES = 'https://www.googleapis.com/auth/calendar'
    CLIENT_SECRET_FILE = '/home/evgen/client_secret.json'
    APPLICATION_NAME = 'Google Calendar API Python Quickstart'

    home_dir = os.path.expanduser('~')
    print home_dir
    credential_dir = os.path.join(home_dir, '.credentials')
    if not os.path.exists(credential_dir):
        os.makedirs(credential_dir)
    credential_path = os.path.join(credential_dir, 'calendar-python-quickstart.json')

    store = Storage(credential_path)
    credentials = store.get()
    if not credentials or credentials.invalid:
        flow = client.flow_from_clientsecrets(CLIENT_SECRET_FILE, SCOPES)
        flow.user_agent = APPLICATION_NAME
        if flags:
            credentials = tools.run_flow(flow, store, flags)
        else:
            credentials = tools.run(flow, store)
        print('Storing credentials to ' + credential_path)
    return credentials


def googleCalendarAuth():
    credentials = get_credentials()
    http = credentials.authorize(httplib2.Http())
    del services[:]
    services.append(discovery.build('calendar', 'v3', http=http))
    print services
    print '---------------------------------*******************------------------'
