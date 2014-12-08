var TimeTable = new Class(
	{
		Implements: [Events],

		Binds: [
			'eventReady',
			'eventResize',
			'updateJobs',
			'updateClasses',
			'updateTimeTable',
			'eventJobChanged',
			'eventClassChanged',
			'emptyTable',
			'persistParams',
			'prepareSelects'
		],


		dataFetcher: undefined,

		table: undefined,

		selectJob:   undefined,
		selectClass: undefined,

		date: undefined,

		panel:     undefined,
		panelHead: undefined,
		panelBody: undefined,

		headerDateWeek: undefined,
		headerDateYear: undefined,

		/**
		 * Constructor. Sets up the application
		 * @fires init
		 */
		initialize: function () {
			// define language we want to use (for loclization/date stuff)
			Locale.use('de-CH');


			// init data fetcher
			this.dataFetcher = new TimeTableFetcher();

			// create html table
			this.table = new HtmlTable(
				{
					properties: {
						'class': 'table table-bordered table-hover timetable'
					},
					headers:    ['Von', 'Bis', 'Fach', 'Lehrer', 'Raum', 'Kommentar']
				}
			);

			// create selects
			this.selectJob = new Element('select', {'class': 'form-control'});
			this.selectClass = new Element('select', {'class': 'form-control'});

			// add event listeners to selects
			this.selectJob.addEvent('change', this.eventJobChanged);
			this.selectClass.addEvent('change', this.eventClassChanged);

			// create date (used for navigation in time)
			this.date = new Date();

			// add DOMReady event
			document.addEvent('domready', this.eventReady);
			window.addEvents(
				{
					'resize:throttle(30)': this.eventResize
				}
			);

			this.addEvents(
				{
					'jobChanged':   this.jobChanged,
					'classChanged': this.classChanged,
					'ready':        this.prepareSelects
				}
			);

			this.fireEvent('init');
		},

		jobChanged: function (job_id) {
			Cookie.write('job', job_id, {duration: 30});
			var job_option = this.selectJob.getElement('.job-' + job_id);
			if (job_option) {
				job_option.set('selected', true);
			}
		},

		classChanged: function (class_id) {
			Cookie.write('class', class_id, {duration: 30});
			var class_option = this.selectClass.getElement('.class-' + class_id);
			if (class_option) {
				class_option.set('selected', true);
			}
		},

		prepareSelects: function () {
			var cookie_class = Cookie.read('class');
			var cookie_job = Cookie.read('job');
			this.addEvent(
				'updatedJobs:once', function () {
					this.addEvent(
						'updatedClasses:once', function () {
							if (cookie_class) {
								this.changeClass(cookie_class);
							}
						}
					);

					if (cookie_job) {
						this.changeJob(cookie_job);
					}
				}.bind(this)
			);

			this.dataFetcher.fetchJobs(this.updateJobs);
			this.dataFetcher.fetchClasses(this.updateClasses);

		},

		/**
		 * Event Ready. Called when DOM is ready. Now we can create/select Elements and finish initialisation
		 * @fires ready
		 */
		eventReady: function () {
			// get the Elements (by ID)
			this.panel = $('timetable-panel');
			this.panelBody = $('timetable-body');
			this.panelHead = $('timetable-head');

			// put the table inside the panel
			this.panel.adopt(this.table);

			// insert the two selects
			$('job-chooser').adopt(this.selectJob);
			$('class-chooser').adopt(this.selectClass);

			// put a date display in the panel header
			var headerDate = new Element('span', {'class': 'header-date'});
			this.panelHead.adopt(headerDate);

			this.headerDateWeek = new Element('span', {'class': 'date-week'});
			this.headerDateYear = new Element('span', {'class': 'date-year'});
			headerDate.adopt(
				[
					this.headerDateWeek,
					new Element('span', {'class': 'seperator', 'text': '-'}),
					this.headerDateYear
				]
			);

			// update the date display
			this.updateHeaderDate();


			// now, we are ready
			this.fireEvent('ready');
		},

		/**
		 * Updates the Job select.
		 * @param array jobs  The Jobs to display in the select.
		 *                    An array af Job objects, which should be in the format specified by the API-Documentation
		 *
		 * @fires updatedJobs
		 */
		updateJobs: function (jobs) {
			var job_options = [];
			job_options.push(new Element('option', {'value': '', 'text': '-- Bitte Beruf wählen --'}));

			jobs.each(
				function (job) {
					var option = new Element('option', {'value': job.beruf_id, 'text': job.beruf_name});
					option.store('job', job);
					option.addClass('job-' + job.beruf_id);
					job_options.push(option);
				}.bind(this)
			);

			this.selectJob.empty().adopt(job_options);

			this.fireEvent('updatedJobs', jobs);
		},

		/**
		 * Updates the Class select.
		 *
		 * @param array classes The Classes to display in the select.
		 *                      An array af Class objects, which should be in the format specified by the API-Documentation
		 *
		 * @fires updatedClasses
		 */
		updateClasses: function (classes) {
			var class_options = [];
			class_options.push(new Element('option', {'value': '', 'text': '-- Bitte Klasse wählen --'}));

			classes.each(
				function (c) {
					var option = new Element(
						'option',
						{
							'value': c.klasse_id,
							'text':  c.klasse_longname,
							'class': 'class-' + c.klasse_id
						}
					);
					option.store('class', c);
					class_options.push(option);
				}.bind(this)
			);

			this.selectClass.empty().adopt(class_options);
			this.emptyTable();

			this.fireEvent('updatedClasses', classes);
		},

		updateTimeTable: function (tables) {
			var fx = new Fx.Tween(
				$(this.table).getElement('tbody'), {
					transition: Fx.Transitions.Sine,
					duration:   300
				}
			);
			fx.start('opacity', '1', '0').chain(
				function () {
					this.emptyTable();
					var table_days = {};

					if (tables) {
						// splitting array by weekday
						tables.each(
							function (table) {
								if (!(
									table.tafel_wochentag in table_days
									)) {
									table_days[table.tafel_wochentag] = [];
								}
								table_days[table.tafel_wochentag].push(table);
							}.bind(this)
						);

						Object.each(
							table_days, function (tables, weekday) {
								if (tables && tables.length > 0) {
									var first = tables.pick();
									var date = Date.parse(first.tafel_datum);

									// make date heading row
									this.table.push(
										[
											{
												content:    date.format("%A, %e%o %B %Y"),
												properties: {
													colspan: this.table.options.headers.length + 1,
													'class': 'info date-heading'
												}
											}
										],
										null,
										null,
										'th'
									);

									tables.each(
										function (table) {
											this.table.push(
												[
													table.tafel_von,
													table.tafel_bis,
													table.tafel_longfach,
													table.tafel_lehrer,
													table.tafel_raum,
													table.tafel_kommentar
												]
											);
										}.bind(this)
									);
								}
							}, this
						);
					}

					this.fireEvent('updatedTable', tables);

					fx.start('opacity', '0', '1');
				}.bind(this)
			);
		},

		/**
		 * Updates the header Date according to this.date
		 */
		updateHeaderDate: function () {
			this.headerDateWeek.set('text', this.date.get('week'));
			this.headerDateYear.set('text', this.date.get('year'));

			this.fireEvent('updatedHeaderDate');
		},

		eventResize: function () {

		},

		eventJobChanged: function (event) {
			var select = event.target;
			var selected_option = select.getElement('option:selected');
			var selected_job_id = selected_option.get('value');

			this.changeJob(selected_job_id);
		},

		changeJob: function (job_id) {
			if (job_id) {
				this.dataFetcher.fetchClasses(this.updateClasses, job_id);
				this.fireEvent('jobChanged', job_id);
			} else {
				this.dataFetcher.fetchClasses(this.updateClasses);
				this.fireEvent('jobChanged');
			}
		},

		eventClassChanged: function (event) {
			var select = event.target;
			var selected_option = select.getElement('option:selected');
			var selected_class_id = selected_option.get('value');

			this.changeClass(selected_class_id);
		},

		changeClass: function (class_id) {
			if (class_id) {
				this.dataFetcher.fetchTable(
					this.updateTimeTable,
					class_id,
					this.date.get('week'),
					this.date.get('year')
				);
				this.fireEvent('classChanged', class_id);

			} else {
				this.updateTimeTable();
				this.fireEvent('classChanged');
			}
		},

		emptyTable: function () {
			this.table.empty();
		}
	}
);


document.timetable = new TimeTable();