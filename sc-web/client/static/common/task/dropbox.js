$(function () {$("#import-dropbox-button").click(function () {
            var request = {};
            function convert(data, c) {
                    $.ajax({
                        url: '/write',
                        type: "POST",
                        data: {
                            json: data,
                            service: 'dropbox'
                        },
                        success: function (data) {
                            c(data);
                        }
                    });
                }                      // DROPBOX

            var client = new Dropbox.Client({
                key: "jgkzlyd03c5dww1",
                rememberUser: true
            });


            var dropboxGetInfo = function(client) {
                client.getAccountInfo(function(error, accountInfo) {
                  if (error) {
                    return showError(error);
                  }
                  console.log(accountInfo);
                  request.account = accountInfo                     // !!!! ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ
                });

                var path = "/";
                var nextPath = path;
                var entr = [];

                var readDir = function(path) {
                  return new Promise(function(resolve, reject) {
                    client.readdir(path, function(error, entries) {
                      if (error) {
                        return reject(error);
                      }
                      if (entries) {
                        return Promise.all(entries.map(function(item, i, arr) {
                          entr.push(path + entries[i]);
                          nextPath = path;
                          nextPath += item + '/';
                          return readDir(nextPath);
                        })).then(resolve)
                        .catch(reject);
                      } else {
                        return resolve();
                      }
                    });
                  }) 
                };



                readDir(nextPath).then(function() {
                  request.files = entr; 
                  console.log('asdasd');
                  convert(request);                    // !!!! ВОТ ЭТО МАССИВ С ФАЙЛАМИ
                })
                .catch(function(err) {
                  console.log(err);
                  console.log('asdasd');

                });
            }

          
                if (client.isAuthenticated()) {
                dropboxGetInfo();
            } else {
                client.authenticate(function(error, client) {
                    if (error) {
                      return handleError(error);
                    }
                    dropboxGetInfo(client);
                });       
            } 
                
               
        });
});
