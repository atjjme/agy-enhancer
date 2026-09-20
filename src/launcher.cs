using System;
using System.Diagnostics;
using System.IO;

namespace AgyEnhancer
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                string vbs = Path.Combine(baseDir, "scripts", "agy-enhancer.vbs");
                if (!File.Exists(vbs))
                {
                    vbs = Path.Combine(baseDir, "agy-enhancer.vbs");
                }

                if (File.Exists(vbs))
                {
                    ProcessStartInfo psi = new ProcessStartInfo("wscript.exe", "\"" + vbs + "\"");
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    Process.Start(psi);
                }
            }
            catch
            {
                // Silent fail-safe
            }
        }
    }
}
