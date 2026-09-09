import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrls: ['./about.css'],
})
export class About {
  protected readonly cifras = [
    {
      valor: '6',
      texto: 'categorías turísticas',
    },
    {
      valor: '20+',
      texto: 'experiencias disponibles',
    },
    {
      valor: '100+',
      texto: 'reservas realizadas',
    },
    {
      valor: '4.9/5',
      texto: 'valoración promedio',
    },
  ];

  protected readonly valores = [
    {
      icono: '01',
      titulo: 'Compromiso con el viajero',
      descripcion:
        'Nos enfocamos en brindar experiencias seguras, claras y bien organizadas para cada persona que reserva con nosotros.',
    },
    {
      icono: '02',
      titulo: 'Amamos la sencillez',
      descripcion:
        'Buscamos que explorar tours, reservar y pagar sea un proceso simple, rápido y agradable.',
    },
    {
      icono: '03',
      titulo: 'Respeto y cercanía',
      descripcion:
        'Valoramos a nuestros usuarios, guías, administradores y a cada destino turístico que forma parte de nuestra plataforma.',
    },
    {
      icono: '04',
      titulo: 'Innovación constante',
      descripcion:
        'Mejoramos continuamente el sistema para ofrecer una experiencia moderna, intuitiva y confiable.',
    },
    {
      icono: '05',
      titulo: 'Impulso al turismo local',
      descripcion:
        'Promovemos lugares emblemáticos de Guayaquil y experiencias que fortalecen el turismo y la cultura local.',
    },
  ];

  protected readonly equipo = [
    {
      nombre: 'Jolaus Chevez',
      cargo: 'Desarrollo Frontend - CEO y fundador de SITG',
      imagen: '/yo.png',
    },
    {
      nombre: 'Manuel Hurtado',
      cargo: 'Desarrollo Backend',
      imagen: '/manuelito.png',
    },
    {
      nombre: 'Jhon Rodriguez',
      cargo: 'Gestión y experiencia del usuario',
      imagen: '/yondriz.png',
    },
  ];
}
