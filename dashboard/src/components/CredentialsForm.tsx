import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";

import api from "shared/api";
import aws from "assets/aws.png";
import credsIcon from "assets/creds.png";
import addCircle from "assets/add-circle.png";

import { Context } from "shared/Context";

import Heading from "components/form-components/Heading";
import Helper from "./form-components/Helper";
import InputRow from "./form-components/InputRow";
import SaveButton from "./SaveButton";
import Loading from "./Loading";

type Props = {
  goBack: () => void;
  proceed: (x: any) => void;
};

type AWSCredential = {
  created_at: string;
  id: number;
  user_id: number;
  project_id: number;
  aws_arn: string;
};


const CredentialsForm: React.FC<Props> = ({
  goBack,
  proceed,
}) => {
  const { currentProject } = useContext(Context);
  const [awsCredentials, setAWSCredentials] = useState<AWSCredential[]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [awsAccessKeyID, setAWSAccessKeyID] = useState("");
  const [awsSecretAccessKey, setAWSSecretAccessKey] = useState("");
  const [selectedCredentials, setSelectedCredentials] = useState<AWSCredential>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createStatus, setCreateStatus] = useState("");

  useEffect(() => {
    api
      .getAWSIntegration(
        "<token>",
        {},
        {
          project_id: currentProject.id,
        }
      )
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          setAWSCredentials([]);
        } else {
          setAWSCredentials(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [currentProject]);

  const createCreds = () => {
    setCreateStatus("loading");

    api
      .createAWSIntegration(
        "<token>",
        {
          // Hardcoded for backward-compatibility
          // TODO: remove
          aws_region: "us-east-f",

          aws_access_key_id: awsAccessKeyID,
          aws_secret_access_key: awsSecretAccessKey,
          aws_assume_role_arn: "",
        },
        {
          id: currentProject.id,
        }
      )
      .then(({ data }) => {
        setCreateStatus("successful");
        proceed(data.cloud_provider_credentials_id);
      })
      .catch((err) => {
        console.error(err);
        setCreateStatus("Error creating credentials");
      });
  };

  const renderContent = () => {
    if (awsCredentials.length > 0 && !showCreateForm) {
      return (
        <>
          <CredentialList>
            {
              awsCredentials.map((cred: AWSCredential, i: number) => {
                return (
                  <Credential
                    key={cred.id}
                    isSelected={cred.id === selectedCredentials?.id}
                    onClick={() => {
                      if (cred.id === selectedCredentials?.id) {
                        setSelectedCredentials(null);
                      } else {
                        setSelectedCredentials(cred);
                      }
                    }}
                  >
                    <Icon src={credsIcon} />
                    <Name>{cred.aws_arn || "n/a"}</Name>
                  </Credential>
                );
              })
            }
            <CreateRow onClick={() => {
              setShowCreateForm(true);
              setSelectedCredentials(null);
            }}>
              <Icon src={addCircle} />
              Add new AWS credentials
            </CreateRow>
          </CredentialList>
          <Br height="34px" />
          <SaveButton
            disabled={!selectedCredentials && true}
            onClick={() => proceed(selectedCredentials.id)}
            clearPosition
            text="Continue"
          />
        </>
      );
    }
    return (
      <>
        <StyledForm>
          {
            awsCredentials.length > 0 && (
              <CloseButton onClick={() => setShowCreateForm(false)}>
                <i className="material-icons">close</i>
              </CloseButton>
            )
          }
          <InputRow
            type="string"
            value={awsAccessKeyID}
            setValue={(e: string) => setAWSAccessKeyID(e)}
            label="👤 AWS access ID"
            placeholder="ex: AKIAIOSFODNN7EXAMPLE"
            isRequired
          />
          <InputRow
            type="password"
            value={awsSecretAccessKey}
            setValue={(e: string) => setAWSSecretAccessKey(e)}
            label="🔒 AWS secret key"
            placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
            isRequired
          />
        </StyledForm>
        <SaveButton
          disabled={awsAccessKeyID === "" || awsSecretAccessKey === ""}
          onClick={createCreds}
          status={createStatus}
          statusPosition="right"
          clearPosition
          text="Continue"
        />
      </>
    );
  }

  return (
    <>
      <Heading isAtTop>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer />
        <Img src={aws} />
        Set AWS credentials
      </Heading>
      <Helper>
        Select your credentials from the list below, or add a new set of credentials:
      </Helper>
      {
        isLoading ? (
          <Loading height="150px" />
        ) : (
          renderContent()
        )
      }
    </>
  );
};

export default CredentialsForm;

const CloseButton = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 5px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
    > i {
      color: #ffffff;
    }
  }
  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const Spacer = styled.div`
  height: 1px;
  width: 17px;
`;

const Icon = styled.img`
  width: 15px;
  margin-right: 15px;
`;

const CreateRow = styled.div`
  height: 50px;
  display: flex;
  cursor: pointer;
  align-items: center;
  font-size: 13px;
  padding: 20px;
  background: #ffffff11;
  :hover {
    background: #ffffff18; 
  }
`;

const Br = styled.div<{ height?: string }>`
  width: 100%;
  height: ${props => props.height || "20px"};
`;

const Img = styled.img`
  height: 18px;
  margin-right: 15px;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;

const BackArrow = styled.div`
  width: 30px;
  height: 30px;
  margin-left: -5px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 50%;
  right: 10px;
  top: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const Name = styled.div`
  font-size: 13px;
  font-weight: 500;
`;

const Credential = styled.div<{ isLast?: boolean; isSelected?: boolean }>`
  height: 50px;
  display: flex;
  cursor: pointer;
  align-items: center;
  padding: 20px;
  border-bottom: ${props => props.isLast ? "" : "1px solid #7a7b80"};
  background: ${props => props.isSelected ? "#ffffff33" : "#ffffff11"};

  :hover {
    background: ${props => props.isSelected ? "" : "#ffffff18"}; 
  }
`;

const CredentialList = styled.div`
  width: 100%;
  border: 1px solid #7a7b80;
  border-radius: 5px;
`;

const StyledForm = styled.div`
  position: relative;
  padding: 15px 30px 25px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
`;