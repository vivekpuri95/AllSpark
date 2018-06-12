import argparse
import sys,json,os
import datetime
from googleapiclient.discovery import build
from oauth2client.service_account import ServiceAccountCredentials
import httplib2
from oauth2client import client
from oauth2client import file
from oauth2client import tools
body = sys.argv[1]
cred = sys.argv[2]

dir = os.path.realpath(cred)
SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']
DISCOVERY_URI = ('https://analyticsreporting.googleapis.com/$discovery/rest')
KEY_FILE_LOCATION = dir
SERVICE_ACCOUNT_EMAIL = ''

def initialize_analyticsreporting():

  credentials = ServiceAccountCredentials.from_p12_keyfile(
    SERVICE_ACCOUNT_EMAIL, KEY_FILE_LOCATION, scopes=SCOPES)

  http = credentials.authorize(httplib2.Http())

  # Build the service object.
  analytics = build('analytics', 'v4', http=http, discoveryServiceUrl=DISCOVERY_URI)

  return analytics

analytics = initialize_analyticsreporting()
response = analytics.reports().batchGet(body = json.loads(body)).execute()
print json.dumps(response);