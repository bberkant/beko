import SwiftUI

struct AddCheckView: View {
    @Environment(\.presentationMode) var presentationMode
    @ObservedObject var manager = SupabaseManager.shared
    
    // Form fields state
    @State private var selectedSupplier = "DİVAN HAYVANCILIK"
    @State private var dueDate = Date()
    @State private var amountStr = ""
    @State private var bankName = ""
    @State private var checkNo = ""
    
    // Camera Simulator state
    @State private var isScanning = false
    @State private var scanResultReady = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    
                    // 1. Camera Scan Box (Gölgeli ve kesikli çizgili çek tarama alanı)
                    VStack {
                        if scanResultReady {
                            // Scan Result View
                            ZStack {
                                Image(systemName: "doc.text.viewfinder")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(height: 80)
                                    .foregroundColor(.brandGreen)
                                    .opacity(0.1)
                                
                                VStack(spacing: 8) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 32))
                                        .foregroundColor(.brandGreen)
                                    Text("Çek Başarıyla Tarandı")
                                        .font(.system(size: 13, weight: .bold))
                                    Text("Tutar ve vade bilgileri forma aktarıldı.")
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 150)
                            .background(Color(.systemBackground))
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color.brandGreen.opacity(0.3), lineWidth: 1.5)
                            )
                        } else if isScanning {
                            // Scanner View Simulator
                            VStack(spacing: 12) {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .brandGreen))
                                Text("Çek Bilgileri Çözümleniyor...")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.brandGreen)
                                Text("Vade, tutar ve seri no okunuyor.")
                                    .font(.system(size: 9))
                                    .foregroundColor(.gray)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 150)
                            .background(Color(.systemBackground))
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color.brandGreen.opacity(0.3), lineWidth: 1.5)
                            )
                        } else {
                            // Prompt Box Button
                            Button(action: startMockScan) {
                                VStack(spacing: 12) {
                                    Circle()
                                        .fill(Color.brandGreen.opacity(0.05))
                                        .frame(width: 48, height: 48)
                                        .overlay(Image(systemName: "camera.fill").foregroundColor(.brandGreen).font(.system(size: 18)))
                                    
                                    VStack(spacing: 4) {
                                        Text("Çek Fotoğrafı Çek")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(Color(.label))
                                        Text("Tutar ve vade otomatik taranacaktır.")
                                            .font(.system(size: 10))
                                            .foregroundColor(.gray)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 150)
                                .background(Color(.systemBackground))
                                .cornerRadius(20)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.brandGreen.opacity(0.2), style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .bevel, miterLimit: 10, dash: [5, 5], dashPhase: 0))
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 16)
                    
                    // 2. Input Form fields
                    VStack(spacing: 16) {
                        // Cari list selection
                        VStack(alignment: .left, spacing: 6) {
                            Text("KEŞİDECİ (CARİ HESAP)")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.gray)
                            
                            Picker("Cari Seç", selection: $selectedSupplier) {
                                ForEach(manager.aggregatedCaris.map { $0.supplier }, id: \.self) { name in
                                    Text(name).tag(name)
                                }
                            }
                            .pickerStyle(MenuPickerStyle())
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                            .background(Color(.systemGroupedBackground))
                            .cornerRadius(12)
                        }
                        
                        // Date + Amount row
                        HStack(spacing: 12) {
                            VStack(alignment: .left, spacing: 6) {
                                Text("VADE TARİHİ")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.gray)
                                
                                DatePicker("", selection: $dueDate, displayedComponents: .date)
                                    .labelsHidden()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, 4)
                            }
                            .frame(maxWidth: .infinity)
                            
                            VStack(alignment: .left, spacing: 6) {
                                Text("TUTAR (₺)")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.gray)
                                
                                TextField("0.00", text: $amountStr)
                                    .font(.system(size: 14, weight: .bold))
                                    .keyboardType(.decimalPad)
                                    .padding(12)
                                    .background(Color(.systemGroupedBackground))
                                    .cornerRadius(12)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        
                        // Bank Name
                        VStack(alignment: .left, spacing: 6) {
                            Text("BANKA / ŞUBE")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.gray)
                            
                            TextField("Kuveyt Türk - Samsun Şubesi", text: $bankName)
                                .font(.system(size: 13, weight: .semibold))
                                .padding(12)
                                .background(Color(.systemGroupedBackground))
                                .cornerRadius(12)
                        }
                        
                        // Check Serial Number
                        VStack(alignment: .left, spacing: 6) {
                            Text("ÇEK SERİ NO")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.gray)
                            
                            TextField("CK-894312", text: $checkNo)
                                .font(.system(size: 13, weight: .semibold))
                                .padding(12)
                                .background(Color(.systemGroupedBackground))
                                .cornerRadius(12)
                        }
                    }
                    .padding(20)
                    .background(Color(.systemBackground))
                    .cornerRadius(24)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color(.systemGray5), lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                    
                    // 3. Save button
                    Button(action: saveCheck) {
                        Text("Çeki Portföye Kaydet")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.brandGreen)
                            .cornerRadius(16)
                            .shadow(color: Color.brandGreen.opacity(0.2), radius: 8, x: 0, y: 4)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 10)
                }
                .padding(.bottom, 40)
            }
            .background(Color(red: 0.96, green: 0.97, blue: 0.98))
            .navigationBarTitle("Yeni Çek Ekle", displayMode: .inline)
            .navigationBarItems(leading: Button("Kapat") {
                presentationMode.wrappedValue.dismiss()
            }.foregroundColor(.brandGreen))
        }
    }
    
    // Simulate camera scan and autofill fields
    private func startMockScan() {
        isScanning = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isScanning = false
            scanResultReady = true
            
            // Set form values
            amountStr = "4500000"
            bankName = "Kuveyt Türk - Merzifon Şb."
            checkNo = "CK-994112"
            
            // Set due date to 2026-09-30
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            if let date = formatter.date(from: "2026-09-30") {
                dueDate = date
            }
        }
    }
    
    // Save to Supabase manager
    private func saveCheck() {
        guard let amt = Double(amountStr), !checkNo.isEmpty else { return }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: dueDate)
        
        manager.addCheck(
            supplier: selectedSupplier,
            amount: amt,
            dueDate: dateStr,
            bankName: bankName.isEmpty ? "Kuveyt Türk" : bankName,
            checkNo: checkNo
        )
        
        presentationMode.wrappedValue.dismiss()
    }
}

struct AddCheckView_Previews: PreviewProvider {
    static var previews: some View {
        AddCheckView()
    }
}
