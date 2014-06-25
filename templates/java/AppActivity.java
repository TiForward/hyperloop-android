/**
 * DO NOT EDIT - this is a generated file
 * This source code is protected by US and International Patent Laws and contains
 * patents or patents pending. Copyright (c) 2014 Appcelerator, Inc.
 */
package <%=AppPackage%>;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

public final class <%=AppActivityName%> extends Activity
{
    private static final String TAG = "<%=AppPackage%>.<%=AppActivityName%>";

    static {
        Log.d(TAG,"Starting <%=AppPackage%>.<%=AppActivityName%>");
        System.loadLibrary("gnustl_shared");
        System.loadLibrary("JavaScriptCore");
        System.loadLibrary("<%=AppName%>");

        org.appcelerator.hyperloop.Hyperloop.loadApp();
    }
    
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        Log.d(TAG, "onCreate");
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);
    }
}
