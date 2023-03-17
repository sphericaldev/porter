import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { useLocation } from "react-router";
import settings from "assets/settings-centered.svg";

import api from "shared/api";
import { DetailedIngressError } from "shared/types";
import { getQueryParam } from "shared/routing";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";

import ClusterRevisionSelector from "./ClusterRevisionSelector";
import DashboardHeader from "../DashboardHeader";
import TabSelector from "components/TabSelector";
import ProvisionerSettings from "components/ProvisionerSettings";
import ProvisionerStatus from "./ProvisionerStatus";
import NodeList from "./NodeList";
import { NamespaceList } from "./NamespaceList";
import ClusterSettings from "./ClusterSettings";
import Metrics from "./Metrics";

import CopyToClipboard from "components/CopyToClipboard";
import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";

type TabEnum = "nodes" | "settings" | "namespaces" | "metrics" | "incidents" | "configuration";

var tabOptions: {
  label: string;
  value: TabEnum;
}[] = [{ label: "Additional settings", value: "settings" }];

export const Dashboard: React.FunctionComponent = () => {
  const [currentTab, setCurrentTab] = useState<TabEnum>("nodes");
  const [currentTabOptions, setCurrentTabOptions] = useState(tabOptions);
  const [isAuthorized] = useAuth();
  const location = useLocation();
  const [selectedClusterVersion, setSelectedClusterVersion] = useState(null);
  const [showProvisionerStatus, setShowProvisionerStatus] = useState(false);
  const [provisionFailureReason, setProvisionFailureReason] = useState("");
  const [ingressIp, setIngressIp] = useState(null);
  const [ingressError, setIngressError] = useState(null);

  const context = useContext(Context);
  const renderTab = () => {
    switch (currentTab) {
      case "settings":
        return <ClusterSettings />;
      case "metrics":
        return <Metrics />;
      case "namespaces":
        return <NamespaceList />;
      case "configuration":
        return (
          <>
            <Br />
            <ProvisionerSettings
              selectedClusterVersion={selectedClusterVersion}
              clusterId={context.currentCluster.id}
              credentialId={context.currentCluster.cloud_provider_credential_identifier}
            />
            <Div />
          </>
        );
      default:
        return <NodeList />;
    }
  };

  useEffect(() => {
    if (
      context.currentCluster.status !== "UPDATING_UNAVAILABLE" &&
      !tabOptions.find((tab) => tab.value === "nodes")
    ) {      
      tabOptions.unshift({ label: "Namespaces", value: "namespaces" });
      tabOptions.unshift({ label: "Metrics", value: "metrics" });
      tabOptions.unshift({ label: "Nodes", value: "nodes" }); 
    }
    
    if (
      context.currentProject.capi_provisioner_enabled &&
      !tabOptions.find((tab) => tab.value === "configuration")
    ) {
      tabOptions.unshift({ value: "configuration", label: "Configuration" });
    } 
  }, []);

  useEffect(() => {
    setCurrentTabOptions(
      tabOptions.filter((option) => {
        if (option.value === "settings") {
          return isAuthorized("cluster", "", ["get", "delete"]);
        }
        return true;
      })
    );
  }, [isAuthorized]);

  useEffect(() => {
    const selectedTab = getQueryParam({ location }, "selected_tab");
    if (tabOptions.find((tab) => tab.value === selectedTab)) {
      setCurrentTab(selectedTab as any);
    }
  }, [location]);

  // Need to reset tab to reset views that don't auto-update on cluster switch (esp namespaces + settings)
  useEffect(() => {
    setShowProvisionerStatus(false);
    if (context.currentProject.capi_provisioner_enabled) {
      setCurrentTab("configuration");
    } else {
      setCurrentTab("nodes");
    }
  }, [context.currentCluster]);

  const renderIngressIp = (
    ingressIp: string | undefined,
    ingressError: DetailedIngressError
  ) => {
    if (typeof ingressIp !== "string") {
      return (
        <Url onClick={(e) => e.preventDefault()}>
          <Loading />
        </Url>
      );
    }

    if (!ingressIp.length && ingressError) {
      return (
        <>
          <Bolded>Ingress IP:</Bolded>
          <span>{ingressError.message}</span>
        </>
      );
    }

    if (!ingressIp.length) {
      return (
        <>
          <Bolded>Ingress IP:</Bolded>
          <span>Ingress IP not available</span>
        </>
      );
    }

    return (
      <>
      <Bolded>To configure custom domains for your apps, add a CNAME record pointing to the following Ingress IP:</Bolded>
      <br /><br />
      <CopyToClipboard
        as={Url}
        text={ingressIp}
        wrapperProps={{ onClick: (e: any) => e.stopPropagation() }}
      >
        <span>{ingressIp}</span>
        <i className="material-icons-outlined">content_copy</i>
      </CopyToClipboard>
      </>
    );
  };

  const updateClusterWithDetailedData = async () => {
    try {
      const res = await api.getCluster(
        "<token>",
        {},
        {
          project_id: context.currentProject.id,
          cluster_id: context.currentCluster.id,
        }
      );
      if (res.data) {
        const { ingress_ip, ingress_error } = res.data;
        setIngressIp(ingress_ip);
        setIngressError(ingress_error);
      }
    } catch (error) {}
  };

  useEffect(() => {
    updateClusterWithDetailedData();
  }, []);

  const renderContents = () => {
    if (context.currentProject.capi_provisioner_enabled) {
      return (
        <>
          <ClusterRevisionSelector
            selectedClusterVersion={selectedClusterVersion}
            setSelectedClusterVersion={setSelectedClusterVersion}
            setShowProvisionerStatus={setShowProvisionerStatus}
            setProvisionFailureReason={setProvisionFailureReason}
          />
          {(
            showProvisionerStatus && (
              context.currentCluster.status === "UPDATING" ||
              context.currentCluster.status === "UPDATING_UNAVAILABLE"
            )
          ) && (
            <>
              <ProvisionerStatus
                provisionFailureReason={provisionFailureReason}
              />
              <Spacer y={1} />
            </>
          )}
          <TabSelector
            options={currentTabOptions}
            currentTab={currentTab}
            setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
          />
          {renderTab()}
        </>
      );
    } else {
      return (
        <>
          <TabSelector
            options={currentTabOptions}
            currentTab={currentTab}
            setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
          />
          {renderTab()}
        </>
      );
    }
  };

  return (
    <>
      <DashboardHeader
        image={settings}
        title={context.currentCluster.vanity_name || context.currentCluster.name}
        description={
          ingressIp ? (
            <>{renderIngressIp(ingressIp, ingressError)}</>
          ) : (
            `Cluster settings and status for ${context.currentCluster.vanity_name || context.currentCluster.name}.`
          )
        }
        disableLineBreak
        capitalize={false}
      />

      {renderContents()}
    </>
  );
};

const Div = styled.div`
  width: 100%;
  height: 50px;
`;

const Br = styled.div`
  width: 100%;
  height: 35px;
`;

const RevisionHeader = styled.div`
  color: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
    props.isCurrent ? "#ffffff66" : "#f5cb42"};
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 15px;
  cursor: pointer;
  :hover {
    background: ${props => props.showRevisions && "#ffffff18"};
    > div > i {
      background: ${props => props.showRevisions && "#ffffff22"};
    }
  }
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  margin-top: 25px;
  margin-bottom: 22px;

  > div > i {
    margin-left: 12px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    background: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
      props.showRevisions ? "#ffffff18" : ""};
    transform: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
      props.showRevisions ? "rotate(180deg)" : ""};
  }
`;

const Revision = styled.div`
  color: #ffffff;
  margin-left: 5px;
`;

const RevisionPreview = styled.div`
  display: flex;
  align-items: center;
`;

const DashboardIcon = styled.div`
  height: 35px;
  min-width: 35px;
  width: 35px;
  border-radius: 5px;
  margin-right: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  > i {
    font-size: 18px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #8b949f;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #8b949f;
  font-size: 13px;
  > i {
    color: #8b949f;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: -20px;
  font-size: 13px;
  margin-bottom: 25px;
`;

const Url = styled.a`
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  cursor: pointer;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const Bolded = styled.span`
  color: #aaaabb;
  margin-right: 6px;
  white-space: nowrap;
`;

const FormWrapper = styled.div<{ showSave?: boolean }>`
  width: 100%;
  margin-top: 35px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  padding: 30px;
`;
