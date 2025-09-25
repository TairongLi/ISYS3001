// import { Routes } from '@angular/router';

// // Correct imports without .ts
// //import { LoginComponent } from './login/login';
// import { App } from './app'; 
// import { AdminDashboardComponent } from './admin/dashboard/dashboard';
// import { StaffDashboardComponent } from './staff/dashboard/dashboard';

// export const routes: Routes = [
//   //{ path: '', component: LoginComponent },
//   { path: '', component: App },
//   { path: 'admin-dashboard', component: AdminDashboardComponent },
//   { path: 'staff-dashboard', component: StaffDashboardComponent }
  
// ];
import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { AdminDashboardComponent } from './admin/dashboard/dashboard';
import { StaffDashboardComponent } from './staff/dashboard/dashboard'; // updated import
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'staff', component: StaffDashboardComponent } // updated component
];
