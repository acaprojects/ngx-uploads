
const domain = 'localhost:8080';
const secure = false;
const valid_ssl = false;

const PROXY_CONFIG = [
    {
        context: [
            "/api",
        ],
        target: `http${secure ? 's' : ''}://${domain}`,
        secure: valid_ssl,
        changeOrigin: true
    }
];

module.exports = PROXY_CONFIG;
