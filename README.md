# CloudHole

Firefox web extension for cross-website CloudFlare cookies.

### Installation
Install like any other Firefox add-on from the [CloudHole add-on page](https://addons.mozilla.org/addon/cloudhole/) on addons.mozilla.org or from [about:addons](about:addons)

#### Description
Tired of solving CloudFlare captchas for half the websites you visit because you're using a VPN or TOR? This add-on is for you.

CloudFlare is a great service, and there's nothing wrong with having to solve captchas to prove you're not a robot, but it can get very tedious since their clearance cookie is not applied to other websites, prompting you to solve a captcha for each and every website you visit that is using their service.

This add-on stores the user agent and clearance cookie when you solve a captcha, and re-uses it on other websites as long as it's still valid, easing the pain during your browsing session.

It can also fetch and share clearance cookies with the CloudHole API, allowing you and other users to crowdsource valid cookies, either for use on other devices, embedded systems or API calls which can't use a full browser to solve those captchas.
