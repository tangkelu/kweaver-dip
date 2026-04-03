# General Knowledge Network (GKN) Build Process

This document explains how to implement a **General Knowledge Network (GKN)** in an environment with **Business Knowledge Network** capabilities by importing a GKN template, binding data views, and running a full build.

## Role of the General Knowledge Network

The **General Knowledge Network (GKN)** is designed for semantic understanding of data. In scenarios such as retrieval and Q&A, it semantically associates and locates business objects, then maps them to specific logical views and fields, so that users or downstream capabilities can identify the right object, land on the correct view, and obtain the required data.

On that basis, when a domain knowledge network binds real business data, it can reuse the semantic objects and view relationships already accumulated in the GKN, reducing duplicate configuration and ensuring consistent binding behavior.

## Prerequisites

Before you begin, confirm the following items one by one:

<sheet token="ZHpQs8wbIhMm7mtRPIKcD7hvnxg_OWqgVI"/>

### Small Models and ConfigMaps

Knowledge network construction depends on small-model capabilities. In addition to registering the required small model on the platform and ensuring that its endpoint is reachable, you must also modify the ConfigMaps mounted by the related services in the cluster. Small-model switches, model names, and related settings are defined in these ConfigMaps rather than only through UI selection.

- `bkn-backend-cm`: the ConfigMap used by the `bkn-backend` service. Enable the small-model switch, for example `defaultSmallModelEnabled: true`, based on the actual key names in your manifest.
- `ontology-query-cm`: the ConfigMap used by the `ontology-query` service. Likewise, set the small-model-related switch to `true` according to the actual key names and YAML fragments in your environment.

The small-model name configured in these ConfigMaps must exactly match the small-model name added in **Deploy** (deployment manifests or the model deployment settings in the deployment workspace), including case and suffix conventions. Otherwise, the model may not be found during build or retrieval.

### Obtain the `model_id` (Small Model ID)

The `model_id` in the template represents the small-model ID and must match the small model required by the build process.

1. Open the deployment workspace and go to **Model Management**.
2. Switch to the **Small Models** list, then open or refresh the page so that it loads the small-model data.
3. Use the browser developer tools (`F12`) and open the **Network** panel. Select the request corresponding to the small-model list and inspect the JSON response.
4. Locate `data.model_id` in the response body. If `data` is an array, compare the individual list items or pagination structure to identify the target small model, then write that value into the `model_id` field of `General Knowledge Network (GKN).json`.

## Steps

### Step 1: Import the GKN Template

Locate `General Knowledge Network (GKN).json` in the workspace directory and import it through the **Business Knowledge Network** module.

### Step 2: Configure the Data Connection and Run a Scan

1. Add a new data source under **Data Connection** and select the built-in database `af_main`.
2. Run **Scan** for that data source to ensure that database tables and views are synchronized to metadata.

### Step 3: Open the GKN and Enter Object Classes

Return to **Business Knowledge Network**, open the imported **General Knowledge Network (GKN)**, and enter the **Object Class** list.

### Step 4: Bind `af_main` Views for Each Object Class

Edit each object class one by one and uniformly bind the corresponding view from `af_main`.

The mapping relationship is as follows:

<sheet token="ZHpQs8wbIhMm7mtRPIKcD7hvnxg_2xWvxg"/>

### Step 5: Trigger a Full Build

After the bindings above are completed, go to **Task Management > New > Full Build** and run the build task.

## Notes

- Binding order: complete the view binding for all object classes in Step 4 before running the full build. Otherwise, semantic objects may become inconsistent or incomplete.
- Scan issues: if the expected views still do not appear after scanning, verify that the connection parameters and scan scope of `af_main` are configured correctly.
