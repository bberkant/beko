export interface Vehicle{id:string;plate:string;brand:string;model:string;modelYear:number;vehicleType:string;fuelType:string;currentKm:number;assignedTo:string;department:string;purchaseDate?:string;inspectionDate?:string;insuranceDate?:string;cascoDate?:string;status:'aktif'|'bakimda'|'pasif'|'satildi';description?:string}
export type VehicleInput=Omit<Vehicle,'id'>;
export interface VehicleExpense{id:string;vehicleId:string;date:string;type:string;amount:number;km?:number;supplier:string;description:string;hasDocument:boolean}
export interface VehicleExpenseInput{vehicleId:string;date:string;type:string;amount:number;km?:number;supplier:string;description:string;file?:File}
