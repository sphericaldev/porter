import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";
import _ from "lodash";
import yaml from "js-yaml";
import github from "assets/github-white.png";

import { Context } from "shared/Context";
import api from "shared/api";
import web from "assets/web.png";

import Back from "components/porter/Back";
import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";
import Button from "components/porter/Button";
import SourceSelector, { SourceType } from "./SourceSelector";
import DynamicLink from "components/DynamicLink";

import SourceSettings from "./SourceSettings";
import Services from "./Services";
import EnvGroupArray, {
  KeyValueType,
} from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import GithubActionModal from "./GithubActionModal";
import {
  ActionConfigType,
  GithubActionConfigType,
  RepoType,
} from "shared/types";
import Error from "components/porter/Error";
import { z } from "zod";
import { PorterJson, PorterYamlSchema, createFinalPorterYaml } from "./schema";
import { ReleaseService, Service } from "./serviceTypes";
import { Helper } from "components/form-components/Helper";
import GithubConnectModal from "./GithubConnectModal";

type Props = RouteComponentProps & {};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_branch: "",
  git_repo_id: 0,
  kind: "github",
};

interface FormState {
  applicationName: string;
  selectedSourceType: SourceType | undefined;
  serviceList: Service[];
  releaseJob: ReleaseService[];
  envVariables: KeyValueType[];
  releaseCommand: string;
}

const INITIAL_STATE: FormState = {
  applicationName: "",
  selectedSourceType: undefined,
  serviceList: [],
  releaseJob: [],
  envVariables: [],
  releaseCommand: "",
};

const Validators: {
  [key in keyof FormState]: (value: FormState[key]) => boolean;
} = {
  applicationName: (value: string) => value.trim().length > 0,
  selectedSourceType: (value: SourceType | undefined) => value !== undefined,
  serviceList: (value: Service[]) => value.length > 0,
  envVariables: (value: KeyValueType[]) => true,
  releaseCommand: (value: string) => true,
  releaseJob: (value: ReleaseService[]) => true,
};

type Detected = {
  detected: boolean;
  message: string;
};
interface GithubAppAccessData {
  username?: string;
  accounts?: string[];
}
type Provider =
  | {
    provider: "github";
    name: string;
    installation_id: number;
  }
  | {
    provider: "gitlab";
    instance_url: string;
    integration_id: number;
  };
const NewAppFlow: React.FC<Props> = ({ ...props }) => {
  const [templateName, setTemplateName] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imageTag, setImageTag] = useState("latest");
  const { currentCluster, currentProject } = useContext(Context);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [deploymentError, setDeploymentError] = useState<string | undefined>(
    undefined
  );
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [existingStep, setExistingStep] = useState<number>(0);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    ...defaultActionConfig,
  });
  const [buildView, setBuildView] = useState<string>("buildpacks");
  const [branch, setBranch] = useState("");
  const [dockerfilePath, setDockerfilePath] = useState(null);
  const [procfilePath, setProcfilePath] = useState(null);
  const [folderPath, setFolderPath] = useState(null);
  const [buildConfig, setBuildConfig] = useState({});
  const [porterYaml, setPorterYaml] = useState("");
  const [showGHAModal, setShowGHAModal] = useState<boolean>(false);
  const [showGithubConnectModal, setShowGithubConnectModal] = useState<boolean>(
    false
  );

  const [showConnectModal, setConnectModal] = useState<boolean>(true);
  const [hasClickedDoNotConnect, setHasClickedDoNotConnect] = useState(() =>
    JSON.parse(localStorage.getItem("hasClickedDoNotConnect") || "false")
  );
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const [accessData, setAccessData] = useState<GithubAppAccessData>({});
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [hasProviders, setHasProviders] = useState(true);

  const [porterJson, setPorterJson] = useState<PorterJson | undefined>(
    undefined
  );
  const [detected, setDetected] = useState<Detected | undefined>(undefined);
  const handleSetAccessData = (data: GithubAppAccessData) => {
    setAccessData(data);
    setShowGithubConnectModal(
      !hasClickedDoNotConnect &&
      (accessError || !data.accounts || data.accounts?.length === 0)
    );
  };

  const handleSetAccessError = (error: boolean) => {
    setAccessError(error);
    setShowGithubConnectModal(
      !hasClickedDoNotConnect &&
      (error || !accessData.accounts || accessData.accounts?.length === 0)
    );
  };

  const updateStackStep = async (step: string) => {
    try {
      if (currentCluster?.id == null || currentProject?.id == null) {
        throw "Unable to capture analytics, project or cluster not found";
      }
      await api.updateStackStep(
        "<token>",
        {
          step,
          stack_name: formState.applicationName,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      );
    } catch (err) {
      // TODO: handle analytics error
    }
  }

  const validatePorterYaml = (yamlString: string) => {
    let parsedYaml;
    try {
      parsedYaml = yaml.load(yamlString);
      const parsedData = PorterYamlSchema.parse(parsedYaml);
      const porterYamlToJson = parsedData as PorterJson;
      setPorterJson(porterYamlToJson);
      const newServices = [];
      const newReleaseJob = [];
      const existingServices = formState.serviceList.map((s) => s.name);
      for (const [name, app] of Object.entries(porterYamlToJson.apps)) {
        if (!existingServices.includes(name)) {
          if (app.type) {
            newServices.push(Service.default(name, app.type, porterYamlToJson));
          } else if (name.includes("web")) {
            newServices.push(Service.default(name, "web", porterYamlToJson));
          } else {
            newServices.push(Service.default(name, "worker", porterYamlToJson));
          }
        }
      }
      if (!formState.releaseJob.length && porterYamlToJson.release != null) {
        newReleaseJob.push(Service.default("pre-deploy", "release", porterYamlToJson) as ReleaseService);
      }
      const newServiceList = [...formState.serviceList, ...newServices];
      const newReleaseJobList = [...formState.releaseJob, ...newReleaseJob];
      setFormState({ ...formState, serviceList: newServiceList, releaseJob: newReleaseJobList });
      if (Validators.serviceList(newServiceList)) {
        setCurrentStep(Math.max(currentStep, 5));
      }
      if (
        porterYamlToJson &&
        porterYamlToJson.apps &&
        Object.keys(porterYamlToJson.apps).length > 0
      ) {
        setDetected({
          detected: true,
          message: `Detected ${Object.keys(porterYamlToJson.apps).length} service${Object.keys(porterYamlToJson.apps).length === 1 ? "" : "s"} from porter.yaml`,
        });
      } else {
        setDetected({
          detected: false,
          message:
            "Could not detect any services from porter.yaml. Make sure it exists in the root of your repo.",
        });
      }
    } catch (error) {
      console.log("Error converting porter yaml file to input: " + error);
    }
  };
  const sortProviders = (providers: Provider[]) => {
    const githubProviders = providers.filter(
      (provider) => provider.provider === "github"
    );

    const gitlabProviders = providers.filter(
      (provider) => provider.provider === "gitlab"
    );

    const githubSortedProviders = githubProviders.sort((a, b) => {
      if (a.provider === "github" && b.provider === "github") {
        return a.name.localeCompare(b.name);
      }
    });

    const gitlabSortedProviders = gitlabProviders.sort((a, b) => {
      if (a.provider === "gitlab" && b.provider === "gitlab") {
        return a.instance_url.localeCompare(b.instance_url);
      }
    });
    return [...gitlabSortedProviders, ...githubSortedProviders];
  };
  useEffect(() => {
    let isSubscribed = true;

    api
      .getGitProviders("<token>", {}, { project_id: currentProject?.id })
      .then((res) => {
        const data = res.data;
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          setHasProviders(false);
          return;
        }

        const sortedProviders = sortProviders(data);
        setProviders(sortedProviders);
        setCurrentProvider(sortedProviders[0]);
      })
      .catch((err) => {
        setHasProviders(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject]);

  const isAppNameValid = (name: string) => {
    const regex = /^[a-z0-9-]{1,61}$/;
    return regex.test(name);
  };
  const handleAppNameChange = (name: string) => {
    setCurrentStep(currentStep);
    setFormState({ ...formState, applicationName: name });
    if (isAppNameValid(name) && Validators.applicationName(name)) {
      setCurrentStep(Math.max(Math.max(currentStep, 1), existingStep));
    } else {
      setExistingStep(Math.max(currentStep, existingStep));
      setCurrentStep(0);
    }
  };

  const handleDoNotConnect = () => {
    setHasClickedDoNotConnect(true);
    localStorage.setItem("hasClickedDoNotConnect", "true");
  };

  const shouldHighlightAppNameInput = () => {
    return (
      formState.applicationName !== "" &&
      (!isAppNameValid(formState.applicationName) ||
        formState.applicationName.length > 61)
    );
  };

  const deployPorterApp = async () => {
    try {
      setDeploying(true);
      setDeploymentError(undefined);

      // log analytics event that we started form submission
      await updateStackStep('stack-launch-complete');

      if (
        currentProject?.id == null ||
        currentCluster?.id == null
      ) {
        throw "Project or cluster not found";
      }

      // validate form data
      const finalPorterYaml = createFinalPorterYaml(
        formState.serviceList,
        formState.releaseJob,
        formState.envVariables,
        porterJson,
        // if we are using a heroku buildpack, inject a PORT env variable
        (buildConfig as any)?.builder != null && (buildConfig as any)?.builder.includes("heroku")
      );

      const yamlString = yaml.dump(finalPorterYaml);
      const base64Encoded = btoa(yamlString);
      const imageInfo = imageUrl
        ? {
          image_info: {
            repository: imageUrl,
            tag: imageTag,
          },
        }
        : {};

      await api.createPorterApp(
        "<token>",
        {
          repo_name: actionConfig.git_repo,
          git_branch: branch,
          git_repo_id: actionConfig?.git_repo_id,
          build_context: folderPath,
          builder: (buildConfig as any)?.builder,
          buildpacks:
            buildView === "buildpacks"
              ? (buildConfig as any)?.buildpacks?.join(",") ?? ""
              : "",
          dockerfile: buildView === "docker" ? dockerfilePath : "",
          image_repo_uri: imageUrl,
          porter_yaml: base64Encoded,
          override_release: true,
          ...imageInfo,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          stack_name: formState.applicationName,
        }
      );

      if (!actionConfig?.git_repo) {
        props.history.push(`/apps/${formState.applicationName}`);
      }

      // log analytics event that we successfully deployed
      await updateStackStep('stack-launch-success');

      return true;
    } catch (err) {
      // TODO: better error handling
      console.log(err);
      const errMessage =
        err?.response?.data?.error ??
        err?.toString() ??
        "An error occurred while deploying your app. Please try again.";
      setDeploymentError(errMessage);

      return false;
    } finally {
      setDeploying(false);
    }
  };
  useEffect(() => {
    setFormState({ ...formState, serviceList: [] });
  }, [actionConfig, branch]);
  useEffect(() => {
    if (imageUrl || dockerfilePath || folderPath) {
      setCurrentStep(Math.max(currentStep, 2));
    }
  }, [imageUrl, buildConfig, dockerfilePath, setCurrentStep, currentStep]);
  // useEffect(() => {
  //   const fetchGithubAccounts = async () => {
  //     try {
  //       const { data } = await api.getGithubAccounts("<token>", {}, {});
  //       setAccessData(data);
  //       if (data) {
  //         setHasProviders(false);
  //       }
  //     } catch (error) {
  //       setAccessError(true);
  //     } finally {
  //       setAccessLoading(false);
  //     }

  //     setConnectModal(
  //       !hasClickedDoNotConnect && (!hasProviders || accessError)
  //     );
  //   };

  //   fetchGithubAccounts();
  // }, [hasClickedDoNotConnect, accessData.accounts, accessError]);

  return (
    <CenterWrapper>
      <Div>
        {showConnectModal && !hasProviders && (
          <GithubConnectModal
            closeModal={() => setConnectModal(false)}
            hasClickedDoNotConnect={hasClickedDoNotConnect}
            handleDoNotConnect={handleDoNotConnect}
            accessData={accessData}
            setAccessLoading={setAccessLoading}
            accessError={accessError}
            setAccessData={handleSetAccessData}
            setAccessError={handleSetAccessError}
          />
        )}
        <StyledConfigureTemplate>
          <Back to="/apps" />
          <DashboardHeader
            prefix={<Icon src={web} />}
            title="Deploy a new application"
            capitalize={false}
            disableLineBreak
          />
          <DarkMatter />
          <VerticalSteps
            currentStep={currentStep}
            steps={[
              <>
                <Text size={16}>Application name</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Lowercase letters, numbers, and "-" only.
                </Text>
                <Spacer y={0.5} />
                <Input
                  placeholder="ex: academic-sophon"
                  value={formState.applicationName}
                  width="300px"
                  error={
                    shouldHighlightAppNameInput() &&
                    (formState.applicationName.length > 30
                      ? "Maximum 30 characters allowed."
                      : 'Lowercase letters, numbers, and "-" only.')
                  }
                  setValue={(e) => {
                    handleAppNameChange(e);
                  }}
                />
                {shouldHighlightAppNameInput()}
              </>,
              <>
                <Text size={16}>Deployment method</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Deploy from a Git repository or a Docker registry.
                  <a
                    href="https://docs.porter.run/deploying-applications/overview"
                    target="_blank"
                  >
                    &nbsp;Learn more.
                  </a>
                </Text>
                <Spacer y={0.5} />
                <SourceSelector
                  selectedSourceType={formState.selectedSourceType}
                  setSourceType={(type) => {
                    setFormState({ ...formState, selectedSourceType: type });
                  }}
                />
                <SourceSettings
                  source={formState.selectedSourceType}
                  imageUrl={imageUrl}
                  setImageUrl={(x) => {
                    setImageUrl(x);
                    setCurrentStep(Math.max(currentStep, 1));
                  }}
                  imageTag={imageTag}
                  setImageTag={setImageTag}
                  actionConfig={actionConfig}
                  setActionConfig={setActionConfig}
                  branch={branch}
                  setBranch={setBranch}
                  dockerfilePath={dockerfilePath}
                  setDockerfilePath={setDockerfilePath}
                  folderPath={folderPath}
                  setFolderPath={setFolderPath}
                  procfilePath={procfilePath}
                  setProcfilePath={setProcfilePath}
                  setBuildConfig={setBuildConfig}
                  porterYaml={porterYaml}
                  setPorterYaml={(newYaml: string) => {
                    validatePorterYaml(newYaml);
                  }}
                  buildView={buildView}
                  setBuildView={setBuildView}
                  setCurrentStep={setCurrentStep}
                  currentStep={currentStep}
                />
              </>,
              <>
                <Text size={16}>
                  Application services{" "}
                  {detected && formState.serviceList.length > 0 && (
                    <AppearingDiv>
                      <Text color={detected.detected ? "#8590ff" : "#fcba03"}>
                        {detected.detected ? (
                          <I className="material-icons">check</I>
                        ) : (
                          <I className="material-icons">error</I>
                        )}
                        {detected.message}
                      </Text>
                    </AppearingDiv>
                  )}
                </Text>
                <Spacer y={0.5} />
                <Services
                  setServices={(services: Service[]) => {
                    setFormState({ ...formState, serviceList: services });
                    if (Validators.serviceList(services)) {
                      setCurrentStep(Math.max(currentStep, 5));
                    }
                  }}
                  services={formState.serviceList}
                  defaultExpanded={true}
                  addNewText={"Add a new service"}
                />
              </>,
              <>
                <Text size={16}>Environment variables (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Specify environment variables shared among all services.
                </Text>
                <EnvGroupArray
                  values={formState.envVariables}
                  setValues={(x: any) => {
                    setFormState({ ...formState, envVariables: x });
                  }}
                  fileUpload={true}
                />
              </>,
              <>
                <Text size={16}>Pre-deploy job (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  If specified, this is a job that will be run before every
                  deployment.
                </Text>
                <Spacer y={0.5} />
                <Services
                  setServices={(releaseJob: ReleaseService[]) => {
                    setFormState({ ...formState, releaseJob });
                  }}
                  services={formState.releaseJob}
                  defaultExpanded={true}
                  limitOne={true}
                  customOnClick={() => {
                    setFormState({
                      ...formState, releaseJob: [Service.default(
                        "pre-deploy",
                        "release",
                        porterJson
                      ) as ReleaseService],
                    })
                  }}
                  addNewText={"Add a new pre-deploy job"}
                />
              </>,
              <Button
                onClick={() => {
                  if (imageUrl) {
                    deployPorterApp();
                  } else {
                    setDeploymentError(undefined);
                    setShowGHAModal(true);
                  }
                }}
                status={
                  deploying ? (
                    "loading"
                  ) : deploymentError ? (
                    <Error message={deploymentError} />
                  ) : undefined
                }
                loadingText={"Deploying..."}
                width={"120px"}
              >
                Deploy app
              </Button>,
            ]}
          />
          <Spacer y={3} />
        </StyledConfigureTemplate>
      </Div>
      {showGHAModal && (
        <GithubActionModal
          closeModal={() => setShowGHAModal(false)}
          githubAppInstallationID={actionConfig.git_repo_id}
          githubRepoOwner={actionConfig.git_repo.split("/")[0]}
          githubRepoName={actionConfig.git_repo.split("/")[1]}
          branch={branch}
          stackName={formState.applicationName}
          projectId={currentProject.id}
          clusterId={currentCluster.id}
          deployPorterApp={deployPorterApp}
          deploymentError={deploymentError}
        />
      )}
    </CenterWrapper>
  );
};

export default withRouter(NewAppFlow);

const I = styled.i`
  font-size: 18px;
  margin-right: 5px;
`;

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 28px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const AppearingDiv = styled.div`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  align-items: center;
  margin-left: 10px;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
`;
const ListWrapper = styled.div`
  width: 100%;
  height: 240px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin-top: 20px;
  padding: 40px;
`;
const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;

const ConnectToGithubButton = styled.a`
  width: 180px;
  justify-content: center;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  color: white;
  font-weight: 500;
  padding: 10px;
  overflow: hidden;
  white-space: nowrap;
  margin-top: 25px;
  border: 1px solid #494b4f;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#2E3338"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "" : "#353a3e"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const GitHubIcon = styled.img`
  width: 20px;
  filter: brightness(150%);
  margin-right: 10px;
`;
