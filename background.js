"use strict";

var clearancesApi = "https://cloudhole.herokuapp.com/clearances";
var surgeClearances = "https://cloudhole.surge.sh/cloudhole.json";
var userAgent = "";
var clearance = "";
var _id = "";
var status = "";
var failing = false;
var useBrowserAgent = false;
var useCloudHoleAPI = true;
var sendClearance = false;

function setUserAgent(newUserAgent) {
  _id = "";
  userAgent = newUserAgent;
  useBrowserAgent = false;
}
function setClearance(newClearance) {
  _id = "";
  clearance = newClearance;
  useBrowserAgent = false;
}
function setUseBrowserAgent(value) {
  useBrowserAgent = value;
  // Reset our values so we don't delete potentially valid clearances
  if (value == true) {
    _id = "";
    clearance = "";
  }
}
function setUseCloudHoleAPI(value, callback) {
  useCloudHoleAPI = value;
  if (value == false) {
    useBrowserAgent = true;
    _id = "";
    userAgent = "";
    clearance = "";
  }
  else {
    fetchClearance(callback);
  }
}

var getClearances = function() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', clearancesApi, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var statusCode = xhr.status;
      if (statusCode == 200) {
        resolve(xhr.response);
      } else {
        getSurgeClearances().then(function(data) {
          resolve(data);
        }, function(errorCode) {
          reject(statusCode + "/" + errorCode);
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
    xhr.open('POST', clearancesApi);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      var statusCode = xhr.status;
      if (statusCode == 201) {
        resolve(xhr.response);
      } else {
        reject(statusCode);
      }
    };
    xhr.send(JSON.stringify(payload));
  });
};

var deleteClearance = function() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', clearancesApi + "/" + _id);
    xhr.setRequestHeader('Content-Type', 'application/json');
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
  for (var header of e.requestHeaders) {
    if (header.name == "Cookie") {
      // Refresh userAgent and clearance if we're seeing a new one, and return headers unchanged
      if (header.value.indexOf("__cfduid") != -1 && header.value.indexOf("cf_clearance") != -1 && useBrowserAgent == true) {
        if (clearance == "" || failing == true) {
          clearance = header.value.match(/cf_clearance=[a-z0-9\-]+/g)[0];

          // Set userAgent to browser-supplied one
          for (var header of e.requestHeaders) {
            if (header.name == "User-Agent") {
              userAgent = header.value;
            }
          }
          sendClearance = true;
          return {requestHeaders: e.requestHeaders};
        }
      }

      if (failing == true && useBrowserAgent == true) {
        // Set userAgent to browser-supplied one
        for (var header of e.requestHeaders) {
          if (header.name == "User-Agent") {
            userAgent = header.value;
          }
        }
        return {requestHeaders: e.requestHeaders};
      }

      // We're currently not failing, and not set to use browser agent, so set our User-Agent
      for (var header of e.requestHeaders) {
        if (header.name == "User-Agent" && userAgent != "") {
          header.value = userAgent;
        }
      }

      // Remove previous __cfduid and cf_clearance
      header.value = header.value.replace(/__cfduid=\w+;?\s?/g, '');
      header.value = header.value.replace(/cf_clearance=[a-z0-9\-]+;?\s?/g, '')

      // Add clearance to existing cookies
      if (header.value.length > 0 && header.value[header.value.length - 1] != ";") {
        header.value += "; ";
      }
      header.value += clearance;

      useBrowserAgent = false;
      return {requestHeaders: e.requestHeaders};
    }
  }
}

function checkHeaders(e) {
  if (e.statusCode == 403) {
    for (var header of e.responseHeaders) {
      if (header.name == "Server" && header.value == "cloudflare-nginx") {
        status = "CloudFlared! Need a new clearance cookie...";
        failing = true;

        if (useBrowserAgent == false && useCloudHoleAPI == true) {
          deleteClearance().then(function(data) {
            status = "Deleted!";
          }, function(returnStatus) {
            status = "Failed to delete clearance: " + returnStatus;
          });
          useBrowserAgent = true;
          chrome.tabs.reload(e.tabId);
        }
      }
    }
  }
  else {
    failing = false;
    useBrowserAgent = false;
    if (sendClearance == true && useCloudHoleAPI == true) {
      var payload = {
        'userAgent': userAgent,
        'cookies': clearance,
        'label': "WebExt"
      };
      postClearance(payload).then(function(data) {
        status = "Posted!";
      }, function(returnStatus) {
        status = "Failed to post clearance to API: " + returnStatus;
      });
      sendClearance = false;
    }
  }
}

var fetchClearance = function(callback) {
  getClearances().then(function(data) {
    var rand = Math.floor(Math.random() * data.length);
    userAgent = data[rand].userAgent;
    clearance = data[rand].cookies;
    _id = data[rand]._id;
    if (callback !== undefined) {
      callback()
    }
  }, function(returnStatus) {
    status = "Failed to get clearance from API: " + returnStatus;
    if (callback !== undefined) {
      callback()
    }
  });
}

if (useCloudHoleAPI == true) {
  fetchClearance();
}

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
