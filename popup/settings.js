
var backgroundPage = chrome.extension.getBackgroundPage();

var refresh = function() {
  document.querySelector("#apikey").value = backgroundPage.apiKey;
  document.querySelector("#useragent").value = backgroundPage.userAgent;
  document.querySelector("#clearance").value = backgroundPage.clearance;
  document.querySelector("#cloudholeapi").checked = backgroundPage.useCloudHoleAPI ? "checked" : false;
  document.querySelector("#status").innerText = backgroundPage.status;
}
backgroundPage.refresh = refresh;
refresh();

document.querySelector("#update").addEventListener("click", function() {
  backgroundPage.status = "";

  var userAgent = document.querySelector("#useragent").value;
  var clearance = document.querySelector("#clearance").value;
  var apiKey = document.querySelector("#apikey").value;
  var useCloudHoleAPI = document.querySelector("#cloudholeapi").checked;

  backgroundPage.setUserAgent(userAgent);
  backgroundPage.setClearance(clearance);

  if (apiKey != "") {
    backgroundPage.setApiKey(apiKey);
  }
  if (useCloudHoleAPI != backgroundPage.useCloudHoleAPI) {
    backgroundPage.setUseCloudHoleAPI(useCloudHoleAPI);
  }

  refresh();
});

document.querySelector("#refresh").addEventListener("click", function() {
  backgroundPage.status = "";
  refresh();

  if (backgroundPage.useCloudHoleAPI == true) {
    backgroundPage.fetchClearance();
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
