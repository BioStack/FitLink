process.env.NODE_ENV = "test";

var rewire = require("rewire"),
    should = require("should"),
    expect = require("chai").expect,
    async  = require("async"),
    fitbitMain = rewire("../main")



describe("dates", function(){

	var getRequestForDate       = fitbitMain.__get__('getRequestForDate');
	var getDateRange            = fitbitMain.__get__('getDateRange');
	var getRequestsForDateRange = fitbitMain.__get__('getRequestsForDateRange');

	it('should return valid url fragment for date and resolution', function(done)
	{
		var req = getRequestForDate("steps","2016-02-15","1d");
		should(req).equal("/activities/steps/date/2016-02-15/1d.json")
		done();
	});

	it('should return next 7 days', function(done)
	{
		var dates = getDateRange("2016-02-15", 7);

		expect(dates).to.have.length(7);
		expect(dates[0]).to.equal("2016-02-15");
		expect(dates[6]).to.equal("2016-02-21");

		done();		
	});

	it('should return valid url fragment for dates', function(done)
	{
		var reqs = getRequestsForDateRange("2016-02-15",7,"steps", "1d");
		expect(reqs).to.have.length(7);
		expect(reqs[0]).to.equal("/activities/steps/date/2016-02-15/1d.json");
		expect(reqs[6]).to.equal("/activities/steps/date/2016-02-21/1d.json");

		done();
	});

	it('should synchronuous visit in order', function(testDone)
	{
		var reqs = getRequestsForDateRange("2016-02-15",7,"steps", "1d");
		var visited = [];
		async.eachSeries( reqs,
    	function (item, callback) 
    	{
    		visited.push(item);
	  		setTimeout(callback, 50);
    	},
    	function done(err)
    	{
        // 5 seconds have passed
        should.not.exist(err);
        //console.log(visited);
        testDone();
    	});

	});


});