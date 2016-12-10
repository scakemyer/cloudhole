"use strict";

var apiKey = 'xxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16).toUpperCase();
});
var clearancesApi = "https://cloudhole.herokuapp.com";
var surgeClearances = "https://cloudhole.surge.sh/cloudhole.json";
var userAgent = "";
var clearance = "";
var _id = "";
var failing = {};
var reloaded = {};
var sendClearance = {};
var useBrowserAgent = {};
var useCloudHoleAPI = true;

var setUserAgent = function(newUserAgent) {
  _id = "";
  userAgent = newUserAgent;
  chrome.storage.local.set({"userAgent": newUserAgent});
}
var setClearance = function(newClearance) {
  _id = "";
  clearance = newClearance;
  chrome.storage.local.set({"clearance": newClearance});
}
var setApiKey = function(newApiKey) {
  _id = "";
  apiKey = newApiKey;
  chrome.storage.local.set({"apiKey": newApiKey});
}
var setUseCloudHoleAPI = function(value) {
  useCloudHoleAPI = value;
  chrome.storage.local.set({"useCloudHoleAPI": value});
  if (value == false) {
    _id = "";
    userAgent = "";
    clearance = "";
  }
  else {
    fetchClearance();
  }
}

var fetchClearance = function() {
  _id = "";
  userAgent = "";
  clearance = "";

  getClearances().then(function(data) {
    if (data.length <= 0) {
      chrome.storage.local.set({"status": "No clearance in CloudHole API."});
    } else {
      var rand = Math.floor(Math.random() * data.length);
      userAgent = data[rand].userAgent;
      clearance = data[rand].cookies;
      _id = data[rand]._id;
      chrome.storage.local.set({"status": "Received clearance from CloudHole API."});
      chrome.storage.local.set({"userAgent": userAgent});
      chrome.storage.local.set({"clearance": clearance});
    }
  }, function(returnStatus) {
    chrome.storage.local.set({"status": `Failed to get clearance from API: ${returnStatus}`});
  });
}

var getClearances = function() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', clearancesApi + '/clearances', true);
    xhr.setRequestHeader('Authorization', apiKey);
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
    xhr.setRequestHeader('Authorization', apiKey);
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

var deleteClearance = function() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', clearancesApi + "/clearances/" + _id);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', apiKey);
    xhr.onload = function() {
      var statusCode = xhr.status;
      if (statusCode == 204) {
        resolve(xhr.response);
      } else {
        reject(statusCode);
      }
    };
    xhr.send();
  });
};

function rewriteHeaders(e) {
  // Add Authorization to request when visiting the CloudHole API page
  if (e.url.indexOf(clearancesApi) != -1) {
    e.requestHeaders.push({
      name: 'Authorization',
      value: apiKey
    });
    return {requestHeaders: e.requestHeaders};
  }

  // Loop through request headers
  for (var header of e.requestHeaders) {
    // Continue if not Cookie header or __cfduid not present
    if (header.name != "Cookie" || header.value.indexOf("__cfduid") == -1) {
      continue;
    }

    // Set userAgent to browser-supplied one or ours
    if (useBrowserAgent[e.tabId] == true) {
      for (var h of e.requestHeaders) {
        if (h.name == "User-Agent") {
          userAgent = h.value;
        }
      }
      reloaded[e.tabId] = 0;
      return {requestHeaders: e.requestHeaders};
    }
    else {
      for (var h of e.requestHeaders) {
        if (h.name == "User-Agent" && userAgent != "") {
          h.value = userAgent;
        }
      }
    }

    // Refresh userAgent and clearance if we're seeing a new one, and return headers unchanged
    if (clearance == "" && header.value.indexOf("cf_clearance") != -1) {
      clearance = header.value.match(/cf_clearance=[a-z0-9\-]+/g)[0];

      // Set userAgent to current one
      for (var h of e.requestHeaders) {
        if (h.name == "User-Agent") {
          userAgent = h.value;
        }
      }
      chrome.storage.local.set({"userAgent": userAgent});
      chrome.storage.local.set({"clearance": clearance});

      reloaded[e.tabId] = 0;
      sendClearance[e.tabId] = true;
      return {requestHeaders: e.requestHeaders};
    }

    // Remove previous __cfduid and cf_clearance
    header.value = header.value.replace(/__cfduid=\w+;?\s?/g, '');
    header.value = header.value.replace(/cf_clearance=[a-z0-9\-]+;?\s?/g, '')

    // Add clearance to existing cookies
    if (header.value.length > 0 && header.value[header.value.length - 1] != ";") {
      header.value += "; ";
    }
    header.value += clearance;

    reloaded[e.tabId] = 0;
    useBrowserAgent[e.tabId] = false;
    return {requestHeaders: e.requestHeaders};
  }
}

function checkHeaders(e) {
  if (e.statusCode == 403) {
    for (var header of e.responseHeaders) {
      if (header.name == "Server" && header.value == "cloudflare-nginx") {
        chrome.storage.local.set({"status": "CloudFlared! Need a new clearance cookie..."});
        failing[e.tabId] = true;

        if (useBrowserAgent[e.tabId] == false && useCloudHoleAPI == true && reloaded[e.tabId] > 0) {
          deleteClearance().then(function(data) {
            chrome.storage.local.set({"status": "Deleted previous clearance from CloudHole API."});
          }, function(returnStatus) {
            chrome.storage.local.set({"status": `Failed to delete clearance: ${returnStatus}`});
          });
          useBrowserAgent[e.tabId] = true;
        }

        if (sendClearance[e.tabId] == true && reloaded[e.tabId] < 2) {
          reloaded[e.tabId] += 1;
          chrome.tabs.reload(e.tabId);
        }
      }
    }
  }
  else {
    failing[e.tabId] = false;
    useBrowserAgent[e.tabId] = false;
    if (sendClearance[e.tabId] == true && useCloudHoleAPI == true) {
      sendClearance[e.tabId] = false;
      var payload = {
        'userAgent': userAgent,
        'cookies': clearance,
        'label': "WebExt"
      };
      postClearance(payload).then(function(data) {
        chrome.storage.local.set({"status": "Synced clearance with CloudHole API."});
        if (reloaded[e.tabId] < 2) {
          reloaded[e.tabId] += 1;
          chrome.tabs.reload(e.tabId);
        }
      }, function(returnStatus) {
        chrome.storage.local.set({"status": `Failed to sync clearance with API: ${returnStatus}`});
      });
    }
  }
}

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

getKey().then(function(data) {
  apiKey = data.key;
  chrome.storage.local.set({"apiKey": apiKey});
  chrome.storage.local.set({"status": "API key received from CloudHole API."});
  fetchClearance();
}, function(returnStatus) {
  chrome.storage.local.set({"status": `Failed to get API key: ${returnStatus}, using random session key.`});
  fetchClearance();
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  rewriteHeaders,
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
  checkHeaders,
  {urls: ["<all_urls>"]},
  ["blocking", "responseHeaders"]
);
