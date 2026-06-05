import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Tour, Tuorservicio } from '../../services/tuorservicio';

@Component({
  selector: 'app-detalletour',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './detalletour.html',
  styleUrls: ['./detalletour.css'],
})
export class Detalletour {
  private route = inject(ActivatedRoute);
  private tourService = inject(Tuorservicio);

  protected tour?: Tour;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.tour = this.tourService.getById(id);
  }
}
