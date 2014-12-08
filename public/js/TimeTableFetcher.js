/**
 * API Abstraction
 * @type {Class}
 */
var TimeTableFetcher = new Class(
	{
		Implements: [Events, Options, Chain],

		Binds: ['errorHandler'],

		options: {
			baseURL:    'http://home.gibm.ch/interfaces/133/',
			jobsURL:    'berufe.php',
			classesURL: 'klassen.php',
			tableURL:   'tafel.php'
		},

		jobsRequest:    undefined,
		classesRequest: undefined,
		tableRequest:   undefined,

		/**
		 * Constructor. Init data fetcher.
		 * @param options
		 */
		initialize: function (options) {
			this.setOptions(options);

			this.jobsRequest = new Request.JSON(
				{
					url: this.options.baseURL + this.options.jobsURL,
					link:      'cancel',
					method:    'get',
					secure:    true,
					onFailure: this.errorHandler
				}
			);
			delete this.jobsRequest.headers;

			this.classesRequest = new Request.JSON(
				{
					url: this.options.baseURL + this.options.classesURL,
					link:      'cancel',
					method:    'get',
					secure:    true,
					onFailure: this.errorHandler
				}
			);
			delete this.classesRequest.headers;

			this.tableRequest = new Request.JSON(
				{
					url: this.options.baseURL + this.options.tableURL,
					link:      'cancel',
					method:    'get',
					secure:    true,
					onFailure: this.errorHandler
				}
			);
			delete this.tableRequest.headers;
		},

		/**
		 * Fetches Jobs an pass it to the provided callback
		 * @param callback
		 */
		fetchJobs: function (callback) {

			this.jobsRequest.onSuccess = callback;

			this.jobsRequest.send();
		},

		/**
		 * Fetches Classes an pass it to the provided callback
		 * @param callback
		 * @param job_id
		 */
		fetchClasses: function (callback, job_id) {
			var data = null;

			if (job_id) {
				data = {
					'beruf_id': job_id
				};
			}

			this.classesRequest.onSuccess = callback;

			this.classesRequest.send(
				{
					data: data
				}
			);
		},

		fetchTable: function (callback, class_id, week, year) {
			var data = {
				'klasse_id': class_id
			};

			if (!year) {
				year = new Date().get('year');
			}

			if (week) {
				week = Number.from(week);
				year = Number.from(year);
				data['woche'] = "{week}-{year}".substitute(
					{
						'week': week.zeroFill(2),
						'year': year
					}
				);
			}

			this.tableRequest.onSuccess = callback;

			this.tableRequest.send(
				{
					data: data
				}
			);
		},

		errorHandler: function (xhr) {
			console.error(xhr);
			alert('Es ist ein Fehler beim abrufen der Daten aufgetreten. \nStatus-Text: ' + xhr.statusText);
		}
	}
);