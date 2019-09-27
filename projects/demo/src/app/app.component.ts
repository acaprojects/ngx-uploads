import { Component, ViewEncapsulation } from '@angular/core';
import { UploadManager, Amazon } from 'projects/library/src/public-api';

@Component({
    selector: 'app-root',
    templateUrl: `./app.component.html`,
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AppComponent {
    public model: { [name: string]: any } = {};

    constructor(private _upload_manager: UploadManager) {
        this._upload_manager.token = '';
        UploadManager.addProvider(Amazon);
        this._upload_manager.autoStart = true;
        this._upload_manager.endpoint = '/api/staff/uploads';
    }

    public uploadFile(event) {
        console.log('Event:', event);
    }

}
