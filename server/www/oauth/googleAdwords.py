import sys,os,csv
from flask import Blueprint
from googleads import adwords
from ...utils.API import API

class GoogleAdwords(API, object):
    def __init__(self):
        super().__init__()

    def getData(self, report, startDate, endDate, columns, credentials, provider_id):

        adwords_client = adwords.AdWordsClient.LoadFromString(credentials)
        report_downloader = adwords_client.GetReportDownloader(version='v201806')

        report_query = (adwords.ReportQueryBuilder()
                        .Select(', '.join([str(x) for x in columns]))
                        .From(report)
                        .During(startDate + ',' + endDate)
                        .Build())

        f = open('server/www/oauth/provider_'+provider_id+'_report.csv','w')

        report_downloader.DownloadReportWithAwql(
            report_query, 'CSV', f, skip_report_header=True,
            skip_column_header=False, skip_report_summary=True,
            include_zero_impressions=True)

        f.close()

        jsonFormat = []

        with open('server/www/oauth/provider_'+provider_id+'_report.csv') as csvfile:
            reader = csv.DictReader(csvfile)
            title = reader.fieldnames
            for row in reader:
                jsonFormat.extend([{title[i]:row[title[i]] for i in range(len(title))}])

        return jsonFormat

ga = Blueprint("adwords", __name__)

@ga.route("/data", methods=["GET", "POST"])
def create():
    adwords = GoogleAdwords()
    return adwords.send_response(adwords.execute(adwords.getData))
