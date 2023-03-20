import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

import loading from "assets/loading.gif";

type Props = {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  status?: string;
  loadingText?: string;
  successText?: string;
};

const Button: React.FC<Props> = ({
  children,
  onClick,
  disabled,
  status,
  loadingText,
  successText,
}) => {
  const renderStatus = () => {
    switch(status) {
      case "success":
        return (
          <StatusWrapper success={true}>
            <i className="material-icons">done</i>
            {successText || "Successfully updated"}
          </StatusWrapper>
        );
      case "loading":
        return (
          <StatusWrapper success={false}>
            <Loading src={loading} />
            {loadingText || "Updating . . ."}
          </StatusWrapper>
        );
      default:
        return (
          <StatusWrapper success={false}>
            <i className="material-icons">error_outline</i>
            Could not update
          </StatusWrapper>
        );
    }
  };

  return (
    <Wrapper>
      <StyledButton
        disabled={disabled}
        onClick={() => !disabled && onClick()}
      >
        <Text>{children}</Text>
      </StyledButton>
      {status && renderStatus()}
    </Wrapper>
  );
};

export default Button;

const Loading = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 9px;
  margin-bottom: 0px;
`;

const floatIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px);
  }
`;

const StatusWrapper = styled.div<{
  success?: boolean;
}>`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-left: 15px;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: ${floatIn} 0.5s;
  animation-fill-mode: forwards;
  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${props => props.success ? "#4797ff" : "#fcba03"};
  }
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Text = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
`;

const StyledButton = styled.button<{
  disabled: boolean;
}>`
  height: 35px;
  font-size: 13px;
  cursor: ${props => props.disabled ? "not-allowed" : "pointer"};
  padding: 15px;
  border: none;
  outline: none;
  font-weight: 500;
  color: white;
  background: ${props => props.disabled ? "#aaaabb" : "#5561C0"};
  display: flex;
  ailgn-items: center;
  justify-content: center;
  border-radius: 5px;

  :hover {
    filter: ${props => props.disabled ? "" : "brightness(120%)"};
  }
`;