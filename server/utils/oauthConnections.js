const URLSearchParams = require('url').URLSearchParams;
const fetch = require('node-fetch');

class OAuthConnection {

    constructor(endpoint, provider) {

        this.endpoint = endpoint;

        Object.assign(this, provider);

        this.provider = provider;

        this.endpoint.assert(this.connection_id, 'Connection ID not found!');
        this.endpoint.assert(this.client_id, 'Client ID not found!');
        this.endpoint.assert(this.client_secret, 'Client secret not found!');
    }

    async validate() {

        const
            connection = {};

        await this.getRefreshToken(connection);
        await this.getAccessToken(connection);

        this.endpoint.mysql.query(
            'UPDATE tb_oauth_connections SET ? WHERE id = ?',
            [connection, this.connection_id]
        );
    }
}

class GoogleAPIs extends OAuthConnection {

    async getRefreshToken(connection) {

        const
            parameters = new URLSearchParams(),
            options = {
                method: 'POST',
                body: parameters,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            };

        parameters.set('code', this.endpoint.request.body.code);
        parameters.set('client_id', this.client_id);
        parameters.set('client_secret', this.client_secret);
        parameters.set('redirect_uri', `http://${this.endpoint.request.headers.host}/connections-manager`);
        parameters.set('grant_type', 'authorization_code');

        let response = await fetch('https://www.googleapis.com/oauth2/v4/token', options);

        response = await response.json();

        this.endpoint.assert(response.refresh_token, `Refresh token not recieved from google, ${JSON.stringify(response)}!`);

        this.refreshToken = connection.refresh_token = response.refresh_token;
    }

    async getAccessToken(connection) {

        const
            parameters = new URLSearchParams(),
            options = {
                method: 'POST',
                body: parameters,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            };

        parameters.set('refresh_token', connection.refresh_token);
        parameters.set('client_id', this.provider.client_id);
        parameters.set('client_secret', this.provider.client_secret);
        parameters.set('grant_type', 'refresh_token');

        let response = await fetch('https://www.googleapis.com/oauth2/v4/token', options);

        response = await response.json();

        this.endpoint.assert(response.access_token, 'Access Token not recieved form Google!');

        this.accessToken = connection.access_token = response.access_token;

        connection.expires_at = new Date(Date.now() + (response.expires_in * 1000)).toISOString().replace('T', ' ').replace('Z', '');
    }

    async test() {

        this.endpoint.assert(this.access_token, 'Access Token not found!');
        this.endpoint.assert(this.refresh_token, 'Refresh Token not found!');

        await this.getAccessToken(this);

        return this.access_token;
    }
}

class FacebookMarketing extends OAuthConnection {

    async getRefreshToken() {

        return null;
    }

    async getAccessToken(connection) {

        const
            parameters = new URLSearchParams(),
            options = {
                method: 'POST',
                body: parameters,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            };

        parameters.set('client_id', this.provider.client_id);
        parameters.set('redirect_uri', `http://${this.endpoint.request.headers.host}/connections-manager`);
        parameters.set('client_secret', this.provider.client_secret);
        parameters.set('code', this.endpoint.request.body.code);

        let response = await fetch('https://graph.facebook.com/v3.0/oauth/access_token', options);

        response = await response.json();

        this.endpoint.assert(response.access_token, `Access Token not recieved form Facebook, ${JSON.stringify(response)}!`);

        connection.access_token = response.access_token;
        connection.expires_at = new Date(Date.now() + (response.expires_in * 1000)).toISOString();
    }

    async test() {

        this.endpoint.assert(this.provider.access_token, 'Access Token not found!');

        let appAccessToken;

        {
            const
                parameters = new URLSearchParams(),
                options = {
                    method: 'POST',
                    body: parameters,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                };

            parameters.set('client_id', this.provider.client_id);
            parameters.set('client_secret', this.provider.client_secret);
            parameters.set('grant_type', 'client_credentials');

            let response = await fetch('https://graph.facebook.com/v3.0/oauth/access_token', options);

            response = await response.json();

            this.endpoint.assert(response.access_token, 'App Access Token not recieved form Facebook!');

            appAccessToken = response.access_token;
        }

        {
            const
                parameters = new URLSearchParams(),
                options = {
                    method: 'GET',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                };

            parameters.set('input_token', this.provider.access_token);
            parameters.set('access_token', appAccessToken);

            let response = await fetch('https://graph.facebook.com/v3.0/debug_token?' + parameters, options);

            response = await response.json();

            this.endpoint.assert(response.data && response.data.is_valid, 'Access token in not valid!');
        }

        return this.provider.access_token;
    }
}


module.exports = {
    GoogleAPIs,
    FacebookMarketing
};