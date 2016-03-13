
var backgroundPage = chrome.extension.getBackgroundPage();

var refresh = function() {
  document.querySelector("#apikey").value = backgroundPage.apiKey;
  document.querySelector("#useragent").value = backgroundPage.userAgent;
  document.querySelector("#clearance").value = backgroundPage.clearance;
  document.querySelector("#browseragent").checked = backgroundPage.useBrowserAgent ? "checked" : false;
  document.querySelector("#cloudholeapi").checked = backgroundPage.useCloudHoleAPI ? "checked" : false;
  document.querySelector("#status").innerText = backgroundPage.status;
}
refresh();

document.querySelector("#update").addEventListener("click", function() {
  var userAgent = document.querySelector("#useragent").value;
  var clearance = document.querySelector("#clearance").value;
  var browserAgent = document.querySelector("#browseragent").checked;
  var useCloudHoleAPI = document.querySelector("#cloudholeapi").checked;

  var backgroundPage = chrome.extension.getBackgroundPage();
  if (userAgent != "") {
    backgroundPage.setUserAgent(userAgent);
  }
  if (clearance != "") {
    backgroundPage.setClearance(clearance);
  }
  if (browserAgent != backgroundPage.useBrowserAgent) {
    backgroundPage.setUseBrowserAgent(browserAgent);
  }
  if (useCloudHoleAPI != backgroundPage.useCloudHoleAPI) {
    backgroundPage.setUseCloudHoleAPI(useCloudHoleAPI, refresh);
  }
  refresh();
});

document.querySelector("#refresh").addEventListener("click", function() {
  if (backgroundPage.useCloudHoleAPI == true) {
    backgroundPage.getClearances().then(function(data) {
      var rand = Math.floor(Math.random() * data.length);
      backgroundPage.userAgent = data[rand].userAgent;
      backgroundPage.clearance = data[rand].cookies;
      backgroundPage._id = data[rand]._id;
      refresh();
    }, function(returnStatus) {
      var status = "Failed to get clearance from API: " + returnStatus;
      backgroundPage.status = status;
      refresh();
    });
  }
  else {
    refresh();
  }
});

document.querySelector("#browseragent").addEventListener("click", function() {
  if (document.querySelector("#browseragent").checked == true) {
    document.querySelector("#useragent").value = navigator.userAgent;
    document.querySelector("#clearance").value = "";
  }
  else {
    refresh();
  }
});
