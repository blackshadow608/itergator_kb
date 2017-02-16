/**
 * Created by root on 8.12.15.
 */
    // Load the SDK Asynchronously
window.fbAsyncInit = function () {
    window.FB.init({
        appId: '414188185437171', // App ID
        status: true,
        version: 'v2.4',
        cookie: true,
        xfbml: false  // parse XFBML
    });
};
(function (d) {
    var js, id = 'facebook-jssdk';
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement('script');
    js.id = id;
    js.async = true;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    d.getElementsByTagName('head')[0].appendChild(js);
}(document));


$(document).ready(function () {
    $("#import-facebook-button").click(function () {

        var accessToken;

        var fbApi = function (accessToken) {
            FB.api('me', {
                fields: ['id', 'name', 'about', 'age_range', 'bio', 'birthday', 'currency', 'devices', 'education', 'email', 'favorite_athletes', 'favorite_teams', 'first_name', 'gender', 'hometown', 'inspirational_people', 'install_type', 'installed', 'interested_in', 'is_shared_login', 'is_verified', 'languages', 'last_name', 'link', 'location', 'locale', 'meeting_for', 'middle_name', 'name_format', 'test_group', 'political', 'relationship_status', 'religion', 'security_settings', 'significant_other', 'sports', 'quotes', 'third_party_id', 'timezone', 'updated_time', 'shared_login_upgrade_required_by', 'verified', 'video_upload_limits', 'viewer_can_send_gift', 'website', 'work', 'public_key', 'cover', 'friends'],
                access_token: accessToken
            }, function (res) {
                if (!res || res.error_msg) {
                    console.log(!res ? 'error occurred' : res.error_msg);
                    return;
                }
                console.log(JSON.stringify(res));
                convert(JSON.stringify(res), function(s){
                    alert(s);
                });
            });
        };
        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                accessToken = response.authResponse.accessToken;
                fbApi(accessToken);
            } else if (response.status === 'not_authorized') {
                accessToken = response.authResponse.accessToken;
                fbApi(accessToken);
            } else {
                FB.login(function (response) {
                    if (response.authResponse) {
                        accessToken = response.authResponse.accessToken;
                        fbApi(accessToken);
                    } else {
                        console.log('User cancelled login or did not fully authorize.');
                    }
                });
            }

        })
    });


    $("#import-dropbox-button").click(function () {

        var client = new Dropbox.Client({
            key: "jgkzlyd03c5dww1",
            rememberUser: true
        });

        //client.authDriver(new Dropbox.AuthDriver.Redirect());

        var dropboxGetInfo = function (client) {
            client.getAccountInfo(function (error, accountInfo) {
                if (error) {
                    return showError(error);  // Something went wrong.
                }
                console.log(accountInfo);
            });

            var path = "/";
            //var entr;

            /*var readDir = */
            client.readdir(path, function (error, entries) {
                if (error) {
                    return 0;  // Something went wrong.
                }
                //entr = entries.slice();
                console.log(entries);
            });

            /*readDir();

             entr.forEach(function(item, i, arr) {
             path = item;
             readDir();
             console.log(entr);
             });*/
        }

        if (client.isAuthenticated()) {
            dropboxGetInfo();
        } else {
            client.authenticate(function (error, client) {
                if (error) {
                    return handleError(error);
                }
                dropboxGetInfo(client);
            });
        }
    });
});

function convert(data, c) {
    $.ajax({
        url: '/write',
        type: "POST",
        data: {
            json: data,
            service: 'facebook'
        },
        success: function (data) {
            c(data);
        }
    });
}