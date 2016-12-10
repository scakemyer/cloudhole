
var clearancesApi = "https://cloudhole.herokuapp.com";
var surgeClearances = "https://cloudhole.surge.sh/cloudhole.json";

var refresh = function() {
  chrome.storage.local.get("apiKey", function(result) {
    document.querySelector("#apikey").value = result.apiKey ? result.apiKey : "";
  });
  chrome.storage.local.get("userAgent", function(result) {
    document.querySelector("#useragent").value = result.userAgent ? result.userAgent : "";
  });
  chrome.storage.local.get("clearance", function(result) {
    document.querySelector("#clearance").value = result.clearance ? result.clearance : "";
  });
  chrome.storage.local.get("useCloudHoleAPI", function(result) {
    document.querySelector("#cloudholeapi").checked = result.useCloudHoleAPI === false ? false : "checked";
  });
  chrome.storage.local.get("status", function(result) {
    document.querySelector("#status").innerText = result.status ? result.status : "";
  });
}
refresh();

var getKey = function() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', clearancesApi + '/key', true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var statusCode = xhr.status;
      if (statusCode == 200) {
        resolve(xhr.response);
      } else {
        reject(statusCode);
      }
    };
    xhr.send();
  });
};

var fetchClearance = function() {
  chrome.storage.local.set({"status": ""}, refresh);

  getClearances().then(function(data) {
    if (data.length <= 0) {
      chrome.storage.local.set({"status": "No clearance in CloudHole API."}, refresh);
    } else {
      var rand = Math.floor(Math.random() * data.length);
      chrome.storage.local.set({"userAgent": data[rand].userAgent});
      chrome.storage.local.set({"clearance": data[rand].cookies});
      chrome.storage.local.set({"status": "Received clearance from CloudHole API."}, refresh);
    }
  }, function(returnStatus) {
    chrome.storage.local.set({"status": `Failed to get clearance from API: ${returnStatus}`}, refresh);
  });
}

var getClearances = function() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', clearancesApi + '/clearances', true);
    xhr.setRequestHeader('Authorization', document.querySelector("#apikey").value);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var statusCode = xhr.status;
      if (statusCode == 200) {
        resolve(xhr.response);
      } else {
        getSurgeClearances().then(function(data) {
          var keyData = [];
          for (var i = 0; i < data.length; i++) {
            if (apiKey == data[i].key) {
              keyData.push(data[i]);
            }
          }
          if (keyData.length > 0) {
            resolve(keyData);
          } else {
            reject("No clearance found.");
          }
        }, function(errorCode) {
          reject(statusCode + " / " + errorCode);
        });
      }
    };
    xhr.send();
  });
};

var getSurgeClearances = function() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', surgeClearances, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var statusCode = xhr.status;
      if (statusCode == 200) {
        resolve(xhr.response);
      } else {
        reject(statusCode);
      }
    };
    xhr.send();
  });
};

var postClearance = function(payload) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', clearancesApi + '/clearances');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', document.querySelector("#apikey").value);
    xhr.onload = function() {
      var statusCode = xhr.status;
      if (statusCode == 201) {
        resolve(xhr.response);
      } else {
        var error = statusCode;
        try {
          error = JSON.parse(xhr.response).error;
        } catch (e) {
          error = statusCode;
        }
        reject(error);
      }
    };
    xhr.send(JSON.stringify(payload));
  });
};

document.querySelector("#save").addEventListener("click", function() {
  chrome.storage.local.set({"status": ""}, refresh);

  var userAgent = document.querySelector("#useragent").value;
  var clearance = document.querySelector("#clearance").value;
  var apiKey = document.querySelector("#apikey").value;
  var useCloudHoleAPI = document.querySelector("#cloudholeapi").checked;

  chrome.storage.local.set({"userAgent": userAgent});
  chrome.storage.local.set({"clearance": clearance});

  if (apiKey != "") {
    chrome.storage.local.set({"apiKey": apiKey});
  }
  chrome.storage.local.get('useCloudHoleAPI', function(result) {
    if (useCloudHoleAPI != result.useCloudHoleAPI) {
      chrome.storage.local.set({"useCloudHoleAPI": useCloudHoleAPI});
    }
  });

  var payload = {
    'userAgent': userAgent,
    'cookies': clearance,
    'label': "WebExtSave"
  };

  postClearance(payload).then(function(data) {
    chrome.storage.local.set({"status": "Saved clearance to CloudHole API."}, refresh);
  }, function(returnStatus) {
    chrome.storage.local.set({"status": `Save failed: ${returnStatus}`}, refresh);
  });
});

document.querySelector("#refresh").addEventListener("click", function() {
  chrome.storage.local.set({"status": ""}, refresh);

  chrome.storage.local.get('useCloudHoleAPI', function(result) {
    if (result.useCloudHoleAPI == true) {
      getKey().then(function(data) {
        chrome.storage.local.get('apiKey', function(result) {
          if (result.apiKey != data.key) {
            chrome.storage.local.set({"apiKey": data.key});
            chrome.storage.local.set({"status": "New API key received from CloudHole API."}, refresh);
            document.querySelector("#apikey").value = data.key;
          }
          fetchClearance();
        });
      }, function(returnStatus) {
        chrome.storage.local.set({"status": `Failed to get API key: ${returnStatus}`}, refresh);
        fetchClearance();
      });
    }
  });
});

document.querySelector("#browseragent").addEventListener("click", function() {
  if (document.querySelector("#browseragent").checked == true) {
    document.querySelector("#useragent").value = navigator.userAgent;
    document.querySelector("#clearance").value = "";
    document.querySelector("#status").innerText = "Click Save to apply changes.";
  } else {
    chrome.storage.local.set({"status": "Using current UserAgent and clearance."}, refresh);
  }
});
