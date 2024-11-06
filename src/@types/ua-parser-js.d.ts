declare module 'ua-parser-js' {
    export default class UAParser {
        constructor(userAgent?: string);
        getResult(): {
            os: {
                name: string;
                version: string;
            };
            device: {
                model: string;
                type: string;
                vendor: string;
            };
            browser: {
                name: string;
                version: string;
            };
        };
    }
}
