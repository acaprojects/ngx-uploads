import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';
import { map, share } from 'rxjs/operators';

import { Upload } from './upload';
import { HashMap, CondoResponse, CondoExtendedResponse } from '../types';

// @dynamic
export class CondoApi {

    public static set token(token: string) {
        CondoApi._token = token;
    }

    constructor(private _http: HttpClient, private _apiEndpoint: string, private _upload: Upload) {
        // Clone the upload params
        this._params = { ...this._upload.metadata };
    }

    private static _token = '';

    public uploadId: string;

    private _params: HashMap;
    private _uploadId: string;
    private _currentRequests = new Set<Observable<any> | Promise<any>>();
    public static hexToBin(input: string) {
        let result = '';

        if (input.length % 2 > 0) {
            input = '0' + input;
        }

        for (let i = 0, length = input.length; i < length; i += 2) {
            result += String.fromCharCode(parseInt(input.slice(i, i + 2), 16));
        }

        return result;
    }

    public init() {
        const file: any = this._upload.file;
        let headers = new HttpHeaders();
        let params = new HttpParams();

        headers = headers.append('Accept', 'application/json');
        headers = headers.append('Content-Type', 'application/json');
        if (CondoApi._token) {
            headers = headers.append('Authorization', `Bearer ${CondoApi._token}`);
        }
        this._params.file_size = file.size;
        this._params.file_name = file.name;

        if (file.dir_path && file.dir_path.length > 0) {
            this._params.file_path = file.dir_path;
        }
        if (this._upload && this._upload.params) {
            for (const p in this._upload.params) {
                if (this._upload.params.hasOwnProperty(p)) {
                    this._params[p] = this._upload.params[p];
                }
            }
        }
        // Build the search params
        params = this._setParams(params, this._params);
        // Return the name of the storage provider (google, amazon, rackspace, etc)
        const req = this._http
            .get(`${this._apiEndpoint}/new`, { params, headers })
            .pipe(
                map((res: CondoResponse) => res.residence),
                share()
            );

        this._monitorRequest(req);

        return req;
    }

    // Create a new upload
    public create(options: HashMap = {}) {
        let headers = new HttpHeaders();
        headers = headers.append('Accept', 'application/json');
        headers = headers.append('Content-Type', 'application/json');

        if (CondoApi._token) {
            headers = headers.append('Authorization', `Bearer ${CondoApi._token}`);
        }

        if (options.file_id) {
            this._params.file_id = options.file_id;
        }
        if (this._upload.mime_type) {
            this._params.file_mime = this._upload.mime_type;
        }

        // We may be requesting the next set of parts
        // TODO:: review this
        if (options.parameters) {
            this._params.parameters = options.parameters;
        }

        const req = this._http
            .post(this._apiEndpoint, JSON.stringify(this._params), {
                headers
            })
            .pipe(
                map((res: CondoExtendedResponse) => {
                    this._uploadId = res.upload_id;
                    return res;
                }),
                share()
            );

        this._monitorRequest(req);

        return req;
    }

    // This requests a chunk signature
    //    Only used for resumable / parallel uploads
    public nextChunk(partNum: number, partId: string, parts: number[], partData: any = null) {
        let search = new HttpParams();
        let headers = new HttpHeaders();
        const body: HashMap = {
            part_list: parts
        };
        let req: Observable<HashMap>;

        if (partData) {
            body.part_data = partData;
        }

        headers = headers.append('Accept', 'application/json');
        headers = headers.append('Content-Type', 'application/json');
        if (CondoApi._token) {
            headers = headers.append('Authorization', `Bearer ${CondoApi._token}`);
        }

        search = this._setParams(search, {
            part: partNum,
            file_id: partId,
            file_mime: this._upload.mime_type
        });

        req = this._http
            .put(`${this._apiEndpoint}/${encodeURIComponent(this._uploadId)}`, JSON.stringify(body), {
                params: search,
                headers
            })
            .pipe(map(_ => _ || {}), share());

        this._monitorRequest(req);

        return req;
    }

    // provides a query request for some providers if required
    public sign(part_number: number | string, part_id: string = null) {
        let search = new HttpParams();
        let headers = new HttpHeaders();
        let req: Observable<HashMap>;

        headers = headers.append('Accept', 'application/json');
        if (CondoApi._token) {
            headers = headers.append('Authorization', `Bearer ${CondoApi._token}`);
        }

        search = search.set('part', part_number.toString());
        if (part_id) {
            search = search.set('file_id', encodeURIComponent(part_id));
        }

        req = this._http
            .get(`${this._apiEndpoint}/${encodeURIComponent(this._uploadId)}/edit`, {
                params: search
            })
            .pipe(map(_ => _ || {}), share());

        this._monitorRequest(req);

        return req;
    }

    // Either updates the status of an upload (which parts are complete)
    // Or is used to indicate that an upload is complete
    public update(params: HashMap = {}) {
        let headers = new HttpHeaders();

        headers = headers.append('Content-Type', 'application/json');
        headers = headers.append('Accept', 'application/json');
        if (CondoApi._token) {
            headers = headers.append('Authorization', `Bearer ${CondoApi._token}`);
        }
        const req: Observable<any> = this._http
            .put(`${this._apiEndpoint}/${encodeURIComponent(this._uploadId)}`, JSON.stringify(params), {
                headers,
                responseType: 'text'
            })
            .pipe(map(i => {
                try {
                    return i ? JSON.parse(i) : i
                } catch (e) {
                    return i
                }
            }), share());

        this._monitorRequest(req);

        return req;
    }

    // Abort any existing requests
    public abort() {
        this._currentRequests.forEach((req: any) => {
            if (req.dispose) { req.dispose(); }
        });

        this._currentRequests.clear();
    }

    // Destroy an upload
    public destroy() {
        this.abort();
        let headers = new HttpHeaders();

        if (CondoApi._token) {
            headers = headers.append('Authorization', `Bearer ${CondoApi._token}`);
        }
        if (this._uploadId) {
            this._http.delete(`${this._apiEndpoint}/${encodeURIComponent(this._uploadId)}`, { headers });
        }
    }

    // Executes the signed request against the cloud provider
    // Not very testable however it's the best we can achieve given the tools
    public signedRequest(opts: CondoExtendedResponse, monitor: boolean = false) {
        const response: HashMap = {};
        let dispose: () => void;

        const promise = new Promise<HashMap>((resolve, reject) => {
            let i: string;
            const xhr = new XMLHttpRequest();
            let observable: any;

            if (monitor) {
                response.progress = new Observable<{ loaded: number; total: number }>(obs => {
                    observable = obs;
                });
            }

            // For whatever reason, this event has to bound before
            // the upload starts or it does not fire (at least on Chrome)
            xhr.upload.addEventListener('progress', (evt: any) => {
                if (evt.lengthComputable && observable) {
                    observable.next({
                        loaded: evt.loaded,
                        total: evt.total
                    });
                }
            });

            xhr.addEventListener('load', (evt: any) => {
                this._currentRequests.delete(promise);

                // We are looking for a success response unless there is an expected response
                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === opts.expected) {
                    resolve(xhr);
                } else {
                    reject(`${xhr.status}: ${xhr.statusText}`);
                }
            });
            xhr.addEventListener('error', evt => {
                this._currentRequests.delete(promise);
                reject(`${xhr.status}: ${xhr.statusText || 'unknown error'}`);
            });
            xhr.addEventListener('abort', evt => {
                this._currentRequests.delete(promise);
                reject(xhr.statusText || 'browser aborted');
            });

            xhr.open(
                opts.signature.verb,
                opts.signature.url,
                true // async
            );

            // Set the headers
            for (i in opts.signature.headers) {
                if (opts.signature.headers.hasOwnProperty(i) && (i.toLowerCase() !== 'content-type' || !this._upload.mime_type)) {
                    xhr.setRequestHeader(i, opts.signature.headers[i]);
                }
            }
            if (this._upload.mime_type) {
                xhr.setRequestHeader('Content-Type', this._upload.mime_type);
            }

            // Allow the request to be cancelled (quack!)
            dispose = () => {
                xhr.abort();
                this._currentRequests.delete(promise);
                reject('user aborted');
            };

            xhr.send(opts.data || null);
        });

        // Hook up the request monitoring
        (promise as any).dispose = dispose;
        this._currentRequests.add(promise);

        response.request = promise;
        return response;
    }

    private _monitorRequest(req: Observable<any> | Promise<any>) {
        this._currentRequests.add(req);
        if (req instanceof Observable) {
            req.subscribe(null, null, () => this._currentRequests.delete(req));
        } else {
            req.then(() => this._currentRequests.delete(req));
        }
    }

    private _setParams(search: HttpParams, params: HashMap): HttpParams {
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                search = search.set(key, encodeURIComponent(params[key]));
            }
        }
        return search;
    }
}
