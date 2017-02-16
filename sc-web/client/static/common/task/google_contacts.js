$(function () {
	$('#import-google-contacts-button').click(function (e) {console.log('work');auth();});
	function auth() {
        var config = {
          'client_id': '782978868624-pq0vn8irdbdmk63sjo7vjj59ekh0igpe.apps.googleusercontent.com',
          'scope': 'https://www.google.com/m8/feeds'
        };
        gapi.auth.authorize(config, function() {
          fetch(gapi.auth.getToken());
        });
      };
      function fetch(token) {
        $.ajax({
          url: 'http://www.google.com/m8/feeds/contacts/default/full?alt=json',
          dataType: 'jsonp',
          data: token
        }).done(function(data) {
            console.log(JSON.stringify(data));
          });
      };
});
