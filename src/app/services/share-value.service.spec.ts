import { TestBed } from '@angular/core/testing';

import { ShareValueService } from './share-value.service';

describe('ShareValueService', () => {
  let service: ShareValueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareValueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
