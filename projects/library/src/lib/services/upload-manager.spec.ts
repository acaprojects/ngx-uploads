import { TestBed, async } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UploadManager } from './upload-manager.service';
import { Md5Workers } from './md5-workers.service';

describe('UploadManager', () => {

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [UploadManager, { provide: Md5Workers, useValue: jasmine.createSpyObj('Md5Workers', ['setup', 'next']) }]
        }).compileComponents();
    }));

    it('should create the service', async(() => {
        const service = TestBed.get(UploadManager);
        expect(service).toBeTruthy();
    }));
});
