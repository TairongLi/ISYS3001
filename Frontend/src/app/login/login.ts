import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeRecord, ensureEmployeesSeeded, readEmployees } from '../shared/employee-storage';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error = signal<string | null>(null);
  private employees: EmployeeRecord[] = [];

  constructor(private router: Router) {
    this.employees = ensureEmployeesSeeded();
  }

  login() {
    if (this.username === 'admin' && this.password === 'adminpass') {
      this.router.navigate(['/admin']);
      return;
     }

     const identifier = this.username.trim().toLowerCase();
     const refreshedEmployees = readEmployees();
     if (refreshedEmployees.length !== this.employees.length) {
       this.employees = refreshedEmployees;
     }

     const employee = refreshedEmployees.find(emp => {
       const phoneMatch = emp.phone.replace(/\s+/g, '') === this.username.trim().replace(/\s+/g, '');
       return emp.email.toLowerCase() === identifier || phoneMatch;
     });

     if (employee && employee.password === this.password) {
       localStorage.setItem('staffSession', JSON.stringify({
         employeeId: employee.id,
         name: employee.name,
         email: employee.email
       }));
       this.error.set(null);
      this.router.navigate(['/staff']);
    return;
    }

    this.error.set('Invalid username or password.');
  }
}
