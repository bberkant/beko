export interface Vehicle{id:string;plate:string;brand:string;model:string;modelYear:number;vehicleType:string;fuelType:string;currentKm:number;assignedTo:string;department:string;purchaseDate?:string;inspectionDate?:string;insuranceDate?:string;cascoDate?:string;status:'aktif'|'bakimda'|'pasif'|'satildi';description?:string;insuranceCompany?:string;kaskoCompany?:string;kaskoStartDate?:string;dainiMurtehin?:string;purchasePrice?:number;currentPrice?:number;}
export type VehicleInput=Omit<Vehicle,'id'>;
export interface VehicleExpense{id:string;vehicleId:string;date:string;type:string;amount:number;km?:number;supplier:string;description:string;hasDocument:boolean}
export interface VehicleExpenseInput{vehicleId:string;date:string;type:string;amount:number;km?:number;supplier:string;description:string;file?:File}
export interface Driver{id:string;fullName:string;phone:string;email:string;identityNumber:string;licenseClass:string;licenseNumber:string;licenseExpiryDate?:string;assignedVehicleId?:string;status:'aktif'|'izinli'|'pasif';description?:string}
export type DriverInput=Omit<Driver,'id'>;
export interface TrafficFine{id:string;vehicleId:string;driverId?:string;fineDate:string;notificationDate?:string;fineNumber:string;violationType:string;location:string;amount:number;paymentStatus:'odenmedi'|'odendi'|'itiraz';paymentDate?:string;description?:string}
export type TrafficFineInput=Omit<TrafficFine,'id'> & {file?:File};
