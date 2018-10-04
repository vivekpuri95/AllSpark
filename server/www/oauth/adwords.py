def saveData(params):

	try:
		adwords_client = adwords.AdWordsClient.LoadFromStorage(os.getcwd()+'/cred.yaml')
	except Exception as e:
		print ('Error fetching client',e)
		sys.exit()

	report_downloader = adwords_client.GetReportDownloader(version='v201806')

	report_query = (adwords.ReportQueryBuilder()
					.Select('CampaignId', 'CampaignName', 'CampaignStatus', 'Impressions', 'Clicks',
							'Cost', 'Date','AllConversions','Labels','LabelIds')
					.From(params['from'])
					.During('TODAY')
					.Build())

	print "Query build"

	f=open('report.csv','w')

	report_downloader.DownloadReportWithAwql(
		report_query, 'CSV', f, skip_report_header=False,
		skip_column_header=False, skip_report_summary=False,
		include_zero_impressions=True)

	f.close()

	print "File saved in the current directory"


if __name__ == '__main__':

	from googleads import adwords
	import sys,os

	os.chdir('server/www/oauth')

	try:
	    jsinput = sys.stdin.readlines()
	    jsinput = json.loads(jsinput[0])
	except Exception as e:
	    print ("Error in reading input",e)
	    sys.exit()

	saveData(jsinput)