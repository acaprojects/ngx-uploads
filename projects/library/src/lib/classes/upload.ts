
import { HttpClient } from '@angular/common/http';

import { ICloudStorage, CloudStorage } from './cloud-storage';
import { CondoApi } from './condo-api';
import { Md5Workers } from '../services/md5-workers.service';
import { error } from '../settings';

// ============================================================
// This is used to manage an upload to a Cloud Storage Provider
// ============================================================
export class Upload {
    public static provider: { [name: string]: ICloudStorage } = {};

    public static humanReadableByteCount(bytes: number, si: boolean = false) {
        const unit = si ? 1000.0 : 1024.0;

        if (bytes < unit) { return bytes + (si ? ' iB' : ' B'); }

        const exp = Math.floor(Math.log(bytes) / Math.log(unit));
        const pre = (si ? 'kMGTPE' : 'KMGTPE').charAt(exp - 1) + (si ? 'iB' : 'B');

        return (bytes / Math.pow(unit, exp)).toFixed(1) + ' ' + pre;
    }
    /** URL to access the file once uploaded */
    public access_url: string;

    public complete: boolean = false;
    public uploading: boolean = false;
    public cancelled: boolean = false;
    public totalBytes: number;
    public progress: number = 0;
    public filename: string = '';
    public mime_type: string = 'binary/octet-stream';
    public metadata: any;    // Data provided at the start and completion of an upload

    // Provide feedback as to why an upload failed
    public error: string;

    // Resolved when the upload completes or is cancelled
    public promise: Promise<Upload>;

    private _initialised: boolean = false;
    private _resolve: any;
    private _reject: any;

    private _api: CondoApi;
    private _provider: CloudStorage;
    private _retries: number = 0;

    constructor(
        private _http: HttpClient,
        private _apiEndpoint: string,
        private _md5Workers: Md5Workers,
        public file: any,
        public retries: number,
        public parallel: number,
        public params: any,
    ) {
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        this.totalBytes = this.file.size;

        if (this.file.name) {
            this.filename = this.file.name;
        }
        if (this.file.type) {
            this.mime_type = this.file.type;
        }
    }

    public resume(parallel?: number) {
        if (!this.uploading && !this.complete && !this.cancelled) {
            this.uploading = true;

            if (parallel) {
                this.parallel = parallel;
            }

            if (!this._initialised) {
                // We need to call new to get details on the upload target
                this._api = new CondoApi(this._http, this._apiEndpoint, this);
                this._api.init().subscribe(
                    (residence) => {
                        this._initialise(residence);

                        if (this._initialised) {
                            this._provider.start();
                        }
                    },
                    (err) => this.notifyError(err.message || err),
                );
            } else {
                this._provider.start();
            }
        }
    }

    public pause() {
        if (this.uploading) {
            this.uploading = false;
            if (this._provider) {
                this._provider.pause();
            }
        }
    }

    public cancel() {

        if (!this.complete && !this.cancelled) {
            this.pause();

            // Destroy the upload if it has started
            if (this._initialised) {
                this._provider.destroy();
                this._initialised = false;
            }

            this.cancelled = true;
            this.uploading = false;
            this._reject(this);
        }
    }

    public isWaiting() {
        if (!this._initialised && !this.complete && !this.uploading && !this.cancelled) {
            return true;
        }
        return false;
    }

    public notifyError(err) {

        error('Manager', 'Error:', err);

        if (this._retries < this.retries) {
            this._retries += 1;

            if (this._initialised) {
                this._provider.start();
            } else {
                this.uploading = false;
                this.resume();
            }
        } else {
            this.pause();
            this.error = err;
        }
    }


    private _initialise(residence: string) {
        const Provider = Upload.provider[residence];
        if (Provider) {
            this._provider = new Provider(this._api, this, this._md5Workers, this._resolve);
            this._initialised = true;
        } else {
            // inform the user that this is not implemented
            this.error = `provider, ${residence}, not found`;
            error('Manager', 'Error:', this.error);

            // The upload cannot be performed
            this.uploading = false;
            this.cancel();
        }
    }
}
