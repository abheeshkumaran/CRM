package com.pypecrm.app.utils

import android.app.AlertDialog
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import java.util.*

class AutoStartHelper private constructor() {

    fun getAutoStartPermission(context: Context) {
        val buildInfo = Build.BRAND.lowercase(Locale.getDefault())
        when (buildInfo) {
            "xiaomi", "redmi", "poco" -> autoStartXiaomi(context)
            "letv" -> autoStartLetv(context)
            "honor" -> autoStartHonor(context)
            "oppo" -> autoStartOppo(context)
            "vivo" -> autoStartVivo(context)
            "nokia" -> autoStartNokia(context)
            "samsung" -> requestIgnoreBatteryOptimizations(context)
            "asus" -> autoStartAsus(context)
            else -> requestIgnoreBatteryOptimizations(context)
        }
    }

    private fun requestIgnoreBatteryOptimizations(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent()
            val packageName = context.packageName
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                intent.action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                intent.data = Uri.parse("package:$packageName")
                try {
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun autoStartXiaomi(context: Context) {
        if (isPackageExists(context, "com.miui.securitycenter")) {
            showAlert(context) {
                try {
                    val intent = Intent()
                    intent.component = ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun autoStartLetv(context: Context) {
        if (isPackageExists(context, "com.letv.android.letvsafe")) {
            showAlert(context) {
                try {
                    val intent = Intent()
                    intent.component = ComponentName("com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity")
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun autoStartHonor(context: Context) {
        if (isPackageExists(context, "com.huawei.systemmanager")) {
            showAlert(context) {
                try {
                    val intent = Intent()
                    intent.component = ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun autoStartOppo(context: Context) {
        if (isPackageExists(context, "com.coloros.safecenter")) {
            showAlert(context) {
                try {
                    val intent = Intent()
                    intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
                    context.startActivity(intent)
                } catch (e: Exception) {
                    try {
                        val intent = Intent()
                        intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")
                        context.startActivity(intent)
                    } catch (ex: Exception) {
                        ex.printStackTrace()
                    }
                }
            }
        }
    }

    private fun autoStartVivo(context: Context) {
        if (isPackageExists(context, "com.iqoo.secure") || isPackageExists(context, "com.vivo.permissionmanager")) {
            showAlert(context) {
                try {
                    val intent = Intent()
                    intent.component = ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
                    context.startActivity(intent)
                } catch (e: Exception) {
                    try {
                        val intent = Intent()
                        intent.component = ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
                        context.startActivity(intent)
                    } catch (ex: Exception) {
                        try {
                            val intent = Intent()
                            intent.setClassName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")
                            context.startActivity(intent)
                        } catch (exx: Exception) {
                            ex.printStackTrace()
                        }
                    }
                }
            }
        }
    }

    private fun autoStartNokia(context: Context) {
        if (isPackageExists(context, "com.evenwell.powersaving.g3")) {
            showAlert(context) {
                try {
                    val intent = Intent()
                    intent.component = ComponentName("com.evenwell.powersaving.g3", "com.evenwell.powersaving.g3.exception.PowerSaverExceptionActivity")
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun autoStartAsus(context: Context) {
        if (isPackageExists(context, "com.asus.mobilemanager")) {
            showAlert(context) {
                try {
                    val intent = Intent()
                    intent.component = ComponentName("com.asus.mobilemanager", "com.asus.mobilemanager.entry.FunctionActivity")
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun showAlert(context: Context, onClick: () -> Unit) {
        AlertDialog.Builder(context)
            .setTitle("Background Reliability")
            .setMessage("To ensure Call Logs and WhatsApp sync accurately in the background, please enable 'Auto-Start' or 'Allow Background Activity' for Pype CRM in the next screen.")
            .setPositiveButton("Open Settings") { dialog, _ ->
                onClick()
                dialog.dismiss()
            }
            .setCancelable(false)
            .show()
    }

    private fun isPackageExists(context: Context, targetPackage: String): Boolean {
        val packages = context.packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
        for (packageInfo in packages) {
            if (packageInfo.packageName == targetPackage) {
                return true
            }
        }
        return false
    }

    companion object {
        val instance: AutoStartHelper
            get() = AutoStartHelper()
    }
}
