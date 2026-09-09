import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarInicio } from './components/navbar-inicio/navbar-inicio';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarInicio, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {}
