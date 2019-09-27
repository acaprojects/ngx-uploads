
/** Dictionary with values of type T */
export interface HashMap<T = any> {
    [key: string]: T;
}

/** Response from Condo API requests */
export interface CondoResponse {
    /** Name of the service provider to upload to */
    residence: string;
}

export interface CondoExtendedResponse extends CondoResponse {
    /** Type of upload to perform */
    type: string;
    /** Upload request details */
    signature: CondoUploadSignature;
    /** Reference ID of the upload for Condo API */
    upload_id: string;
    /** Custom response status expected from request */
    expected?: number;
    /** Body to add to upload request */
    data?: any;
}

export interface CondoUploadSignature {
    /** Upload request HTTP verb */
    verb: HttpVerb;
    /** URL to upload the file to */
    url: string;
    /** Map of headers to add to the upload request */
    headers: HashMap<string>;
}

/** Valid HTTP Verbs. */
export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
