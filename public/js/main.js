var TimeTable = new Class(
	{
		Implements: [Events],

		Binds: ['eventReady', 'eventResize', 'updateJobs', 'updateClasses', 'updateTimeTable', 'eventJobChanged', 'eventClassChanged'],

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
			this.dataFetcher = new TimeTableFetcher();

			this.table = new HtmlTable(
				{
					properties: {
						'class': 'table table-bordered table-hover timetable'
					},
					headers:    ['Von', 'Bis', 'Fach', 'Lehrer', 'Raum', 'Kommentar']
				}
			);

			this.selectJob = new Element('select', {'class': 'form-control'});
			this.selectClass = new Element('select', {'class': 'form-control'});

			this.selectJob.addEvent('change', this.eventJobChanged);
			this.selectClass.addEvent('change', this.eventClassChanged);

			this.date = new Date();

			document.addEvent('domready', this.eventReady);
			window.addEvents(
				{
					'resize:throttle(30)': this.eventResize
				}
			);

			this.fireEvent('init');
		},

		/**
		 * Event Ready. Called when DOM is ready. Now we can create Elements and finish initialisation
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

			// fill data in selects
			this.dataFetcher.fetchJobs(this.updateJobs);
			this.dataFetcher.fetchClasses(this.updateClasses);

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
					var option = new Element('option', {'value': c.klasse_id, 'text': c.klasse_longname});
					option.store('class', c);
					class_options.push(option);
				}.bind(this)
			);

			this.selectClass.empty().adopt(class_options);
			this.table.empty();

			this.fireEvent('updatedClasses', classes);
		},

		updateTimeTable: function (tables) {
			this.table.empty();
			var table_days = {};

			if (tables) {
				// splitting array by weekday
				tables.each(
					function (table) {
						if (!(table.tafel_wochentag in table_days)) {
							table_days[table.tafel_wochentag] = [];
						}
						table_days[table.tafel_wochentag].push(table);
					}.bind(this)
				);

				Object.each(table_days, function (tables, weekday) {
					if (tables && tables.length > 0) {
						var first = tables.pick();
						var date = first.tafel_datum;

						// make date heading row
						this.table.push(
							[
								{
									content: date, // todo format
									properties: {
										colspan: this.table.options.headers.length+1,
										'class': 'info date-heading'
									}
								}
							],
							null,
							null,
							'th'
						);

						tables.each(function (table) {
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
						}.bind(this));
					}
				}, this);
			}
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

			if (selected_job_id) {
				var selected_job = selected_option.retrieve('job');

				this.dataFetcher.fetchClasses(this.updateClasses, selected_job_id);
				this.fireEvent('jobChanged', selected_job);
			} else {
				this.dataFetcher.fetchClasses(this.updateClasses);
				this.fireEvent('jobChanged');
			}
		},

		eventClassChanged: function (event) {
			var select = event.target;
			var selected_option = select.getElement('option:selected');
			var selected_class_id = selected_option.get('value');

			if (selected_class_id) {
				var selected_class = selected_option.retrieve('class');

				this.dataFetcher.fetchTable(
					this.updateTimeTable,
					selected_class_id,
					this.date.get('week'),
					this.date.get('year')
				);
				this.fireEvent('classChanged', selected_class);
			} else {
				this.updateTimeTable();
				this.fireEvent('classChanged');
			}
		}
	}
);


document.timetable = new TimeTable();