// =====================================================================
// Lab 4 - Thua ke va da hinh - Lop khoi tao cho san
// Hoc phan: Lap trinh huong doi tuong (voi C#) - Truong DH Nha Trang
// Sinh vien chep file nay vao du an roi bat dau lam tu Cau 1.
// =====================================================================

using System;

class TaiKhoan
{
    private string soTK;          // cau 1 se doi ba dong nay thanh protected
    private string tenChuTK;
    private double soDu;

    public static int    soLuongTK;              // dem so tai khoan da mo
    public static double laiSuatThang = 0.005;   // lai suat dung chung

    public TaiKhoan()
    {
        soTK = ""; tenChuTK = ""; soDu = 0;
        soLuongTK++;
    }

    public TaiKhoan(string so, string ten, double du)
    {
        soTK = so; tenChuTK = ten; soDu = du;
        soLuongTK++;
    }

    public string SoTK { get { return soTK; } }   // chi doc, dung o cau 10

    public void Nhap()
    {
        Console.Write("So tai khoan : "); soTK     = Console.ReadLine();
        Console.Write("Ten chu TK   : "); tenChuTK = Console.ReadLine();
        soDu = NhapSoThuc("So du        : ");
    }

    public void Xuat()
    {
        Console.WriteLine("{0,-8}{1,-22}{2,16:N0}", soTK, tenChuTK, soDu);
    }

    public double TinhLaiThang()
    {
        return soDu * laiSuatThang;
    }

    // Hai ham nhap an toan, dung chung cho moi cau trong bai
    public static int NhapSoNguyen(string tb)
    {
        int kq;
        while (true)
        {
            Console.Write(tb);
            if (int.TryParse(Console.ReadLine(), out kq)) return kq;
            Console.WriteLine("Du lieu khong hop le, moi nhap lai!");
        }
    }

    public static double NhapSoThuc(string tb)
    {
        double kq;
        while (true)
        {
            Console.Write(tb);
            if (double.TryParse(Console.ReadLine(), out kq)) return kq;
            Console.WriteLine("Du lieu khong hop le, moi nhap lai!");
        }
    }
}
