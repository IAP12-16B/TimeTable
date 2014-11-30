/**
 * Created by Kim Jeker on 02.10.2014.
 */


/* debug stub (covers all firebug methods) */
(
	function (parent) {
		/**
		 * @author koma http://github.com/komaval
		 */
		var noop = function () {
		};
		if (typeof parent.console === "undefined") {
			parent.console = {};
		}
		var console = parent.console;
		var funcs = [
			"dir",
			"log",
			"time",
			"info",
			"warn",
			"count",
			"clear",
			"debug",
			"error",
			"group",
			"trace",
			"assert",
			"dirxml",
			"profile",
			"timeEnd",
			"groupEnd",
			"profileEnd",
			"notifyFirebug",
			"groupCollapsed",
			"getFirebugElement",
			"element",
			"firebug",
			"userObjects"
		];
		for (var i = 0, l = funcs.length; i < l; i++) {
			var func = funcs[i];
			if (typeof(
					console[func]
				) === "undefined") {
				console[func] = noop;
			}
		}
		if (typeof(
				console.element
			) === "undefined") {
			console.element = {};
		}
		if (typeof(
				console.firebug
			) === "undefined") {
			console.element = "foo";
		}
		if (typeof(
				console.userObjects
			) === "undefined") {
			console.element = [];
		}
	}
)(window || self);


Number.implement(
	{
		/**
		 * @param {Number} length
		 * @returns {string}
		 */
		zeroFill: function (length) {
			'use strict';
			var number = '' + this;

			length -= number.length;
			while (--length >= 0) {
				number = '0' + number;
			}

			return number;
		}
	}
);

// Date weekday extension
Date.implement(
	{
		/**
		 * @returns {Number}
		 */
		getRealWeekday: function () {
			'use strict';

			var weekday = this.format('%w');
			/**
			 * weekday in JS weirdness: (0 is Sunday, 1 is Monday)
			 * we definitely need a standard!
			 *
			 * make it a (0 monday, 6 sunday)
			 */
			weekday -= 1;
			if (weekday < 0) {
				weekday += 7;
			}

			return weekday;
		}
	}
);

Element.Events.hashchange = {
	onAdd: function () {
		var hash = location.hash;

		var hashchange = function (event) {
			if (hash == location.hash) {
				return;
			}

			var oldHash = hash;
			hash = location.hash;

			window.fireEvent('hashchange', [hash.substr(1), oldHash.substr(1)]);
			document.fireEvent('hashchange', [hash.substr(1), oldHash.substr(1)]);
		};

		if ((
		    'onhashchange' in window
		    ) &&
		    (
		    (
		    document.documentMode != 5
		    ) &&
		    (
		    document.documentMode != 7
		    )
		    )) {
			window.onhashchange = hashchange;
		}
		else {
			hashchange.periodical(50);
		}
	}
};