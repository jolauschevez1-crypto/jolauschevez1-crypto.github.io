import { TestBed } from '@angular/core/testing';

import { Tuorservicio } from './tuorservicio';

describe('Tuorservicio', () => {
  let service: Tuorservicio;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tuorservicio);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
