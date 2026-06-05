import { TestBed } from '@angular/core/testing';

import { Favorito } from './favorito';

describe('Favorito', () => {
  let service: Favorito;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Favorito);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
