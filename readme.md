# LimaCharlie IaC Generator

## Overview

The LimaCharlie Infrastructure-as-Code (IaC) Generator allows users to select various configurations and automatically generate YAML templates for LimaCharlie deployments. The interface includes several tabs for different configuration categories, each allowing users to select specific options. The YAML is generated live as options are toggled in the UI.

For more information on how to apply IaC configurations to an LC org, read about the infrastructure extension [here](https://docs.limacharlie.io/docs/extensions-lc-extensions-infrastructure).

App URL: https://iac.limacharlie.io/

Repo URL: https://github.com/refractionPOINT/lc-iac-generator/

### Disclaimer / Important Considerations

- The LimaCharlie IaC Generator is designed to inspire and demonstrate the possibilities of Infrastructure-as-Code configurations for cybersecurity platforms. While it provides a range of templates and options for creating detection and response rules, it is not intended to replace a comprehensive and thorough collection of detection rules. Users should conduct their own assessments and testing to ensure that any configurations meet their specific security needs and standards. Always combine these configurations with a robust security strategy and additional custom rules tailored to your environment.

- It is also important to note that some of these configuration items may incur cost. You should carefully [read about these add-ons](https://app.limacharlie.io/add-ons/) before enabling at scale.

- Finally, know that while applying an IaC is generally an "additive" process, meaning the new configuration is typically merged with your existing config, there are exceptions to this. Some hives such as specific extension configurations may be overwritten if a new configuration is applied. For this reason, it is advised to always backup your existing configuration and verify changes after applying a new one.

## UI Components

### Preconfigured Templates Tab

- This tab provides a list of predefined templates for various use cases. Users can select these templates by checking the corresponding checkboxes.
- The templates are loaded from static YAML files in `./templates` -- you may optionally browse to this location and use the original version of the template.
- Each template includes a description that is shown on hover, this description is imported from the template file itself so they are self-describing.

### API Resources Tab

- This tab allows users to select from a set of API resources that can be included in the YAML template.
- Users can select individual API resources or use the "Select All" checkbox to select all available APIs at once.
- Some API resources support (or even expect) a user-provided API key. The generator does not currently support adding this, so it may need to be done seperately after applying the IaC.

### Lookup Resources Tab

- This tab lists various lookup resources that can be included in the YAML configuration.
- Users can select lookup resources individually or use the "Select All" checkbox to select all available lookups.
- Enabling these lookups does not immediately put them to use. You must also leverage D&R rules which perform the lookup tasks. Consider the "Use Lookups" preconfigured template to see how this works.

### Extensions Tab

- The Extensions tab provides checkboxes for selecting different extensions to include in the configuration.
- Users can also choose sub-categories like Rulesets.
    - Note, the "Soteria" rulesets incur additional cost. Read about these rulesets [here](https://docs.limacharlie.io/docs/detection-and-response-managed-rulesets-soteria-rules).

### Artifact Collection Tab

- This tab allows users to configure artifact collection settings for different operating systems using a list of predefined artifact patterns.
- Users can specify settings like `Days Retention`, `Delete After Upload`, and `Ignore Cert Validation`.
- For each OS, users can select specific log files or streams to include in the configuration.

### User Inputs Tab

- The User Inputs tab dynamically displays input fields based on the options selected in other tabs (API Resources, Extensions, etc.).
- When a user selects an option that requires additional data, such as an API key or integration key, the necessary input fields are automatically shown in this tab.
- Each input field is labeled with a description indicating what data is required. For example, selecting the "VirusTotal" API will prompt for a "VirusTotal API Key".
- The badge on the "User Inputs" tab indicates the number of required fields that are currently empty, drawing attention to inputs that still need to be filled in.

## Conclusion

The LimaCharlie IaC Generator is a powerful tool for creating custom IaC templates. By selecting from a variety of templates, API resources, lookup resources, extensions, and artifact collection settings, users can tailor their LimaCharlie deployments to meet specific needs. This README provides an overview of the UI components and functionalities to help users get started.

## Contributing

We welcome contributions to the LimaCharlie IaC Generator! Whether you have ideas for new features, improvements to existing functionality, or bug fixes, your contributions can help enhance this tool for the community. Here’s how you can get involved:

### How to Contribute

1. **Fork the Repository**: Start by forking this repository to your own GitHub account. This creates a personal copy of the project where you can make changes.

2. **Clone the Forked Repository**: Clone your forked repository to your local machine to start working on your changes.
    ```bash
    git clone https://github.com/refractionPOINT/limacharlie-iac-generator.git
    ```

3. **Create a New Branch**: Create a new branch for your changes. Use a descriptive name that explains what you are working on (e.g., `add-new-template`, `fix-bug-in-yaml-output`).
    ```bash
    git checkout -b your-branch-name
    ```

4. **Make Your Changes**: Implement your changes or additions. This could include adding new templates, improving the user interface, or fixing bugs. Be sure to follow the coding style and guidelines of the project.

5. **Test Your Changes**: Ensure that your changes work as expected and do not break existing functionality. Test the changes locally before submitting them.

6. **Commit Your Changes**: Once you’re satisfied with your changes, commit them with a descriptive commit message.
    ```bash
    git add .
    git commit -m "Description of your changes"
    ```

7. **Push Your Changes**: Push your branch to your forked repository on GitHub.
    ```bash
    git push origin your-branch-name
    ```

8. **Create a Pull Request**: Go to the original repository and submit a pull request from your branch. Provide a clear and detailed description of the changes you’ve made, including why you think they should be merged.

### Contribution Guidelines

- **Code Quality**: Please ensure your code follows best practices and is well-documented. Consistent coding style makes it easier for others to read and maintain the code.
- **Commits**: Make small, incremental commits with meaningful messages. This helps in understanding the history and the purpose behind each change.
- **Issues**: If you find a bug or have a feature request, feel free to open an issue. Provide as much detail as possible to help others understand the problem or suggestion.
- **Respect Community Standards**: Be respectful and considerate in your communications and interactions with other contributors. We are committed to fostering an inclusive and welcoming environment for everyone.

### Reporting Issues

If you encounter any issues while using the LimaCharlie IaC Generator, please open an issue on GitHub. Include steps to reproduce the issue, any error messages, and details about your environment (e.g., browser version).

### Getting Help

If you need help with the contribution process or have any questions, feel free to reach out by opening an issue or joining our community [Slack](https://slack.limacharlie.io). We appreciate your interest in contributing and are here to assist!

---

Thank you for your interest in contributing to the LimaCharlie IaC Generator! Together, we can build a powerful and flexible tool for the cybersecurity community.
