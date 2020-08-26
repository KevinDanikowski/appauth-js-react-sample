import { AuthorizationRequest } from "@openid/appauth/built/authorization_request";
import { AuthorizationNotifier } from "@openid/appauth/built/authorization_request_handler";
import { AuthorizationServiceConfiguration } from "@openid/appauth/built/authorization_service_configuration";
import { log } from "@openid/appauth/built/logger";
import { RedirectRequestHandler } from "@openid/appauth/built/redirect_based_handler";
import {
  GRANT_TYPE_AUTHORIZATION_CODE,
  GRANT_TYPE_REFRESH_TOKEN,
  TokenRequest,
} from "@openid/appauth/built/token_request";
import { BaseTokenRequestHandler } from "@openid/appauth/built/token_request_handler";
import { FetchRequestor } from "@openid/appauth/built/xhr";
import { RevokeTokenRequest } from "@openid/appauth/built/revoke_token_request";

const requestor = new FetchRequestor();

/* an example open id connect provider */
const openIdConnectUrl = "https://accounts.google.com";

/* example client configuration */
const clientId =
  "511828570984-7nmej36h9j2tebiqmpqh835naet4vci4.apps.googleusercontent.com";
const redirectUri = "http://localhost:8000/app/redirect.html";
const scope = "openid";

export default class Auth {
  constructor(snackbar) {
    this.notifier = new AuthorizationNotifier();
    this.authorizationHandler = new RedirectRequestHandler();
    this.tokenHandler = new BaseTokenRequestHandler(requestor);
    // set notifier to deliver responses
    this.authorizationHandler.setAuthorizationNotifier(this.notifier);
    // set a listener to listen for authorization responses
    this.notifier.setAuthorizationListener((request, response, error) => {
      log("Authorization request complete ", request, response, error);
      if (response) {
        this.request = request;
        this.response = response;
        this.code = response.code;
        log(`Authorization Code ${response.code}`);
      }
    });
  }

  isAuthorizedUser() {
    return !!this.code;
  }

  signOut() {
    if (!this.configuration) {
      log("Please fetch service configuration.");
      return;
    }

    let request = null;
    if (this.tokenResponse) {
      // use the token response to make a request for an access token
      request = new RevokeTokenRequest({
        client_id: clientId,
        token: this.tokenResponse.accessToken,
      });
    }

    if (request) {
      return this.tokenHandler
        .performRevokeTokenRequest(this.configuration, request)
        .then((response) => {
          this.code = undefined;
          this.tokenResponse = undefined;

          log(`Logged out.`);
        })
        .catch((error) => {
          log("Something bad happened", error);
        });
    }
  }

  hasToken() {
    log(
      "Has token:",
      Boolean(this.tokenResponse && !!this.tokenResponse.accessToken),
      ", Token response: ",
      this.tokenResponse
    );
    return Boolean(this.tokenResponse && !!this.tokenResponse.accessToken);
  }

  fetchServiceConfiguration() {
    return AuthorizationServiceConfiguration.fetchFromIssuer(
      openIdConnectUrl,
      requestor
    )
      .then((response) => {
        log("Fetched service configuration", response);
        this.configuration = response;
      })
      .catch((error) => {
        log("Something bad happened", error);
      });
  }

  makeAuthorizationRequest() {
    // create a request
    let request = new AuthorizationRequest({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
      state: undefined,
      extras: { prompt: "consent", access_type: "offline" },
    });

    if (this.configuration) {
      this.authorizationHandler.performAuthorizationRequest(
        this.configuration,
        request
      );
    } else {
      log(
        "Fetch Authorization Service configuration, before you make the authorization request."
      );
    }
  }

  makeTokenRequest() {
    if (!this.configuration) {
      log("Please fetch service configuration.");
      return;
    }

    let request = null;
    if (this.code) {
      let extras = undefined;
      if (this.request && this.request.internal) {
        extras = {};
        extras["code_verifier"] = this.request.internal["code_verifier"];
      }
      // use the code to make the token request.
      request = new TokenRequest({
        client_id: clientId,
        redirect_uri: redirectUri,
        grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
        code: this.code,
        refresh_token: undefined,
        extras: extras,
      });
    } else if (this.tokenResponse) {
      // use the token response to make a request for an access token
      request = new TokenRequest({
        client_id: clientId,
        redirect_uri: redirectUri,
        grant_type: GRANT_TYPE_REFRESH_TOKEN,
        code: undefined,
        refresh_token: this.tokenResponse.refreshToken,
        extras: undefined,
      });
    }

    if (request) {
      return this.tokenHandler
        .performTokenRequest(this.configuration, request)
        .then((response) => {
          let isFirstRequest = false;
          if (this.tokenResponse) {
            // copy over new fields
            this.tokenResponse.accessToken = response.accessToken;
            this.tokenResponse.issuedAt = response.issuedAt;
            this.tokenResponse.expiresIn = response.expiresIn;
            this.tokenResponse.tokenType = response.tokenType;
            this.tokenResponse.scope = response.scope;
          } else {
            isFirstRequest = true;
            this.tokenResponse = response;
          }

          // unset code, so we can do refresh token exchanges subsequently
          this.code = undefined;
          if (isFirstRequest) {
            log(`Obtained a refresh token ${response.refreshToken}`);
          } else {
            log(`Obtained an access token ${response.accessToken}.`);
          }
        })
        .catch((error) => {
          log("Something bad happened", error);
        });
    }
  }

  checkForAuthorizationResponse() {
    return this.authorizationHandler.completeAuthorizationRequestIfPossible();
  }
}
