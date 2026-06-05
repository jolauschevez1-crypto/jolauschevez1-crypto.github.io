import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css'],
})
export class Registro {
  private readonly router = inject(Router);

  protected register(
  name: HTMLInputElement,
  email: HTMLInputElement,
  password: HTMLInputElement,
  confirmPassword: HTMLInputElement
): void {

  const nameValue = name.value.trim();
  const emailValue = email.value.trim();
  const passwordValue = password.value.trim();
  const confirmValue = confirmPassword.value.trim();

  if (!nameValue) {
    alert('Ingrese su nombre');
    name.focus();
    return;
  }

  if (nameValue.length < 3) {
    alert('El nombre debe tener al menos 3 caracteres');
    name.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailValue)) {
    alert('Correo inválido');
    email.focus();
    return;
  }

  if (passwordValue.length < 8) {
    alert('La contraseña debe tener mínimo 8 caracteres');
    password.focus();
    return;
  }

  if (!/[A-Z]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos una letra mayúscula');
    password.focus();
    return;
  }

  if (!/[a-z]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos una letra minúscula');
    password.focus();
    return;
  }

  if (!/[0-9]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos un número');
    password.focus();
    return;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos un carácter especial');
    password.focus();
    return;
  }

  if (passwordValue !== confirmValue) {
    alert('Las contraseñas no coinciden');
    confirmPassword.focus();
    return;
  }

  alert('Registro exitoso');
  this.router.navigate(['/login']);

  }
}
